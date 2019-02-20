
#define MyAppName "ProcessEngine Runtime"

#ifndef ProcessEngineRuntimeVersion
  #define ProcessEngineRuntimeVersion "Snapshot"
#endif

#define MyAppPublisher "5Minds IT-Solutions GmbH & Co. KG"
#define MyAppURL "https:///www.process-engine.io/"

#define ProcessEngineRuntimeExe "process_engine_runtime-win.exe"
#define ProcessEngineRuntimeExeSource "..\process_engine_runtime-win.exe"

#define StartProcessEngineBat "start_process_engine_runtime.bat"
#define StartProcessEngineBatSource "start_process_engine_runtime.bat"

#define ConfigSource "..\config\*"
#define SQLite3NativesSource "..\node_modules\sqlite3\lib\*"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{8ED8F926-799E-4C66-A45C-EC9565D0B62B}
AppName={#MyAppName}
AppVersion={#ProcessEngineRuntimeVersion}
;AppVerName={#MyAppName} {#ProcessEngineRuntimeVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=Install {#MyAppName} v{#ProcessEngineRuntimeVersion}
Compression=lzma
SolidCompression=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#ProcessEngineRuntimeExeSource}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#StartProcessEngineBatSource}"; DestDir: "{app}"; Flags: ignoreversion
; Copy native bindings for sqlite3.
Source: "{#SQLite3NativesSource}"; DestDir: "{app}\node_modules\sqlite3\lib\"; Flags: createallsubdirs ignoreversion recursesubdirs
; Copy default configuration.
Source: "{#ConfigSource}"; DestDir: "{userappdata}\process_engine_runtime\config"; Flags: createallsubdirs confirmoverwrite recursesubdirs uninsneveruninstall

[Icons]
Name: "{commonprograms}\{#MyAppName}"; Filename: "{app}\{#StartProcessEngineBat}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#StartProcessEngineBat}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#StartProcessEngineBat}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
Filename: "{userappdata}\process_engine_runtime"; Description: "Open application data folder"; Flags: nowait postinstall shellexec skipifsilent unchecked
