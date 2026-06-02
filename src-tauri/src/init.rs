use std::path::PathBuf;
use std::process::Command;

use tauri::Manager;

use crate::config_manager::{Config, find_ollama, load_config, save_config};


pub async fn init(handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let config_dir = con_dir(&handle)?;         // borrow, don't move
    let config = load_config(config_dir)?;
    let ollama_c = ollama_check(config).await?;
    Ok(())
}

fn con_dir(handle: &tauri::AppHandle) -> Result<PathBuf, String> {  // note the &
    let config_dir = handle.path().app_config_dir()
        .map_err(|e| e.to_string())?;
    Ok(config_dir)
}


use reqwest;
async fn ollama_check(ollama_config: Config) -> Result<String, Box<dyn std::error::Error>>
{
    let request_o = reqwest::get(&ollama_config.ollama_url)
    .await?.text().await?;
    Ok(request_o)
}


/// Starts the ollama server if it hasn't been started yet.
async fn start_ollama(mut ollama_config: Config, config_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>>
{
    let ollama_path = match ollama_config.ollama_path.clone() {
        Some(path) => PathBuf::from(path),
        None => {
            let Some(path) = find_ollama() else {
                return Err("Ollama path is not configured and could not be found".into());
            };

            ollama_config.ollama_path = Some(path.to_string_lossy().to_string());
            save_config(config_dir, &ollama_config)?;
            path
        }
    };
    Command::new(ollama_path).spawn()?;
    Ok(())
}
