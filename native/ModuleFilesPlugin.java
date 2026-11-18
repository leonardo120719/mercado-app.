package com.pulpitobible.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "ModuleFiles")
public class ModuleFilesPlugin extends Plugin {
    private File backup;
    private boolean saving;

    @PluginMethod
    public synchronized void beginBackup(PluginCall call) {
        if (saving) { call.reject("Há um backup em andamento."); return; }
        try {
            removeBackup();
            backup = File.createTempFile("pulpito-backup-", ".json", getContext().getCacheDir());
            call.resolve();
        } catch (Exception error) { call.reject("Não foi possível preparar o backup.", error); }
    }

    @PluginMethod
    public synchronized void appendBackup(PluginCall call) {
        if (backup == null || saving) { call.reject("Prepare o backup antes de gravar."); return; }
        String data = call.getString("data");
        if (data == null || data.length() > 262144) { call.reject("Parte do backup inválida."); return; }
        try (FileOutputStream stream = new FileOutputStream(backup, true)) {
            stream.write(Base64.decode(data, Base64.NO_WRAP));
            call.resolve();
        } catch (Exception error) { call.reject("Falha ao preparar os dados do backup.", error); }
    }

    @PluginMethod
    public synchronized void saveBackup(PluginCall call) {
        if (backup == null || backup.length() == 0 || saving) { call.reject("Backup indisponível."); return; }
        saving = true;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, "pulpito-bible-backup-" + new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ROOT).format(new java.util.Date()) + ".json");
        try { startActivityForResult(call, intent, "backupDestination"); }
        catch (Exception error) { saving = false; call.reject("Não foi possível abrir o seletor de arquivos.", error); }
    }

    @ActivityCallback
    private void backupDestination(PluginCall call, ActivityResult result) {
        if (call == null) { synchronized (this) { saving = false; removeBackup(); } return; }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            synchronized (this) { saving = false; removeBackup(); }
            call.reject("Salvamento cancelado.", "CANCELLED");
            return;
        }
        getBridge().execute(() -> {
            try (FileInputStream input = new FileInputStream(backup);
                 OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new java.io.IOException("Destino indisponível.");
                byte[] buffer = new byte[65536];
                int size;
                while ((size = input.read(buffer)) != -1) output.write(buffer, 0, size);
                output.flush();
                call.resolve();
            } catch (Exception error) {
                try { android.provider.DocumentsContract.deleteDocument(getContext().getContentResolver(), uri); }
                catch (Exception ignored) { }
                call.reject("Não foi possível salvar o backup. Escolha outra pasta ou confira o espaço disponível.", error);
            } finally {
                synchronized (this) { saving = false; removeBackup(); }
            }
        });
    }

    @PluginMethod
    public synchronized void discardBackup(PluginCall call) {
        if (!saving) removeBackup();
        call.resolve();
    }

    private void removeBackup() {
        if (backup != null) { backup.delete(); backup = null; }
    }
}
