use std::path::PathBuf;

use tauri::Manager;

use config_manager::load_config;

pub async fn init(handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {                                                                                                                                  
    let config_dir = con_dir(handle)?;
    let ollama_config = load_config(&handle)?;
    ollama_check(ollama_config)
    Ok(())
} 

fn con_dir(handle: tauri::AppHandle) -> Result<PathBuf, String> {                                                                                                                                                        
      let config_dir = handle.path().app_config_dir()                                                                                                                                                                      
          .map_err(|e| e.to_string())?;                                                                                                                                                                                    
    Ok(config_dir)   
}

async fn ollama_check() 