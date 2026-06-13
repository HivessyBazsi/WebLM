use std::path::PathBuf;

use tauri::Manager;
use tokio::process::Command;
use tokio::time::{sleep, Duration};

use crate::config_manager::{Config, LocalConfig, find_ollama, load_config, save_config};


pub async fn init(handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let config_dir = con_dir(&handle)?;
    let config = load_config(config_dir.clone())?;

    load_local_model_prov(config.local_choice, config, config_dir).await?;
    
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
    Command::new(ollama_path).arg("serve").spawn()?;

    for _ in 0..10 {
        sleep(Duration::from_millis(500)).await;
        if reqwest::get(&ollama_config.ollama_url).await.is_ok() {
            return Ok(());
        }
    }
    Err("Ollama started but never became ready".into())
}

async fn load_local_model_prov(local_choice: LocalConfig, mut config: Config, config_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> 
{
    match local_choice {
        LocalConfig::Ollama => {
            if ollama_check(config.clone()).await.is_err() {
                start_ollama(config, config_dir).await?;
            }
        }
        LocalConfig::LlamaCpp => {
            start_llama_cpp(&mut config, &config_dir).await?;
        }
        LocalConfig::None => {
            return Ok(());
        }
    }
    Ok(())
}

async fn start_llama_cpp(_config: &mut Config, _config_dir: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: Implement llama.cpp startup logic here (e.g., find executable, spawn process)
    Ok(())
}