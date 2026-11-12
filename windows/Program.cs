using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new PulpitoWindow());
    }
}

internal sealed class PulpitoWindow : Form
{
    private static readonly Uri Home = new Uri("https://pulpito-bible.onrender.com/");
    private const string RuntimePage = "https://developer.microsoft.com/microsoft-edge/webview2/";
    private readonly WebView2 reader = new WebView2 { Dock = DockStyle.Fill };

    public PulpitoWindow()
    {
        Text = "Púlpito Bible";
        Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        ClientSize = new Size(1200, 800);
        MinimumSize = new Size(420, 540);
        StartPosition = FormStartPosition.CenterScreen;
        AutoScaleMode = AutoScaleMode.Dpi;

        var menu = new MenuStrip { Dock = DockStyle.Top };
        var applicationMenu = new ToolStripMenuItem("Aplicativo");
        applicationMenu.DropDownItems.Add(new ToolStripMenuItem("Início", null,
            (sender, args) => reader.CoreWebView2?.Navigate(Home.AbsoluteUri)));
        applicationMenu.DropDownItems.Add(new ToolStripMenuItem("Recarregar", null,
            (sender, args) => reader.CoreWebView2?.Reload()) { ShortcutKeys = Keys.Control | Keys.R });
        applicationMenu.DropDownItems.Add(new ToolStripMenuItem("Sair", null, (sender, args) => Close()));
        menu.Items.Add(applicationMenu);
        MainMenuStrip = menu;
        Controls.Add(reader);
        Controls.Add(menu);
        Shown += InitializeReader;
    }

    private async void InitializeReader(object sender, EventArgs args)
    {
        try
        {
            var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PulpitoBible", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profile);
            if (IsDisposed || Disposing)
                return;

            await reader.EnsureCoreWebView2Async(environment);
            if (IsDisposed || Disposing)
                return;

            var web = reader.CoreWebView2;
            web.Settings.AreHostObjectsAllowed = false;
            web.Settings.IsWebMessageEnabled = false;
            web.Settings.AreDevToolsEnabled = false;
            web.NavigationStarting += (view, navigation) =>
            {
                if (IsOfficialSite(navigation.Uri))
                    return;

                navigation.Cancel = true;
                if (navigation.IsUserInitiated && !navigation.IsRedirected)
                    OpenWebLink(navigation.Uri);
            };
            web.NewWindowRequested += (view, request) =>
            {
                request.Handled = true;
                if (!request.IsUserInitiated)
                    return;

                if (IsOfficialSite(request.Uri))
                    web.Navigate(request.Uri);
                else
                    OpenWebLink(request.Uri);
            };
            web.Navigate(Home.AbsoluteUri);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            if (IsDisposed || Disposing)
                return;

            var choice = MessageBox.Show(this,
                "O Microsoft Edge WebView2 Runtime é necessário para abrir o Púlpito Bible. Abrir a página da Microsoft?",
                Text, MessageBoxButtons.YesNo, MessageBoxIcon.Information);
            if (choice == DialogResult.Yes)
                OpenWebLink(RuntimePage);
            Close();
        }
        catch (Exception)
        {
            if (IsDisposed || Disposing)
                return;

            MessageBox.Show(this, "Não foi possível iniciar o Púlpito Bible. Feche e tente abrir novamente.",
                Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private static bool IsOfficialSite(string value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out Uri uri)
            && uri.Scheme == Home.Scheme
            && uri.Host == Home.Host
            && uri.Port == Home.Port;
    }

    private void OpenWebLink(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out Uri uri) || uri.Scheme != Uri.UriSchemeHttps)
            return;

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true })?.Dispose();
        }
        catch (System.ComponentModel.Win32Exception)
        {
            MessageBox.Show(this, "Não foi possível abrir o navegador padrão.", Text,
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}
