
#define MyAppName "ProcessEngine Runtime"

#ifndef MyAppVersion
  #define MyAppVersion "3.123.1"
#endif

#define MyAppPublisher "5Minds"
#define MyAppURL "https:///www.process-engine.io/"
#define MyAppExeName "process_engine_runtime-win.exe"
#define StartProcessEngineBat "start_process_engine_runtime.bat"

#define ProcessEngineRuntimeExeSource "..\process_engine_runtime-win.exe"
#define StartProcessEngineBatSource "..\start_process_engine_runtime.bat"
#define ConfigSource "..\config\*"
#define SQLite3NativesSource "..\node_modules\sqlite3\lib\*"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{8ED8F926-799E-4C66-A45C-EC9565D0B62B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=setup
Compression=lzma
SolidCompression=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#ProcessEngineRuntimeExeSource}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#StartProcessEngineBatSource}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ConfigSource}"; DestDir: "{userappdata}\process-engine-runtime\config"; Flags: createallsubdirs confirmoverwrite recursesubdirs uninsneveruninstall
; Copy native bindings for sqlite3.
Source: "{#SQLite3NativesSource}"; DestDir: "{app}\node_modules\sqlite3\lib\"; Flags: createallsubdirs ignoreversion recursesubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{commonprograms}\{#MyAppName}"; Filename: "{app}\{#StartProcessEngineBat}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#StartProcessEngineBat}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#StartProcessEngineBat}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
