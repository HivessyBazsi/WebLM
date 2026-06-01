// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


mod init;
use init::init;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {                                                                                                                                                                                                           
            let handle = app.handle().clone();                                                                                                                                                                                   
            tauri::async_runtime::spawn(async move {
                if let Err(e) = init(handle).await {                                                                                                                                                                             
                    eprintln!("Failed to initialize app: {}", e);
                }                                                                                                                                                                                                                
            });                                                                                                                                                                                                                  
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
