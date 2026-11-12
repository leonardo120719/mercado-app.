[Setup]
AppId={{85F71AC1-AD82-4A34-B99B-F7A2EF24F159}
AppName=Púlpito Bible
AppVersion=1.0.0
AppPublisher=Púlpito Bible
DefaultDirName={localappdata}\Programs\PulpitoBible
DefaultGroupName=Púlpito Bible
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
MinVersion=10.0
UninstallDisplayIcon={app}\PulpitoBible.exe
SetupIconFile=Pulpito.ico
OutputDir=dist
OutputBaseFilename=Pulpito_Bible_Windows_Setup_x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Púlpito Bible"; Filename: "{app}\PulpitoBible.exe"

[Run]
Filename: "{app}\PulpitoBible.exe"; Description: "Abrir o Púlpito Bible"; Flags: nowait postinstall skipifsilent
