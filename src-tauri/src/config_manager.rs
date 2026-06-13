use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LocalConfig {
    Ollama,
    LlamaCpp,
    None,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Config {
    pub config_version: u32,
    pub local_choice: LocalConfig,
    pub ollama_url: String,
    pub ollama_path: Option<String>,
}



impl Default for Config {                                                                                                                                                                                                
    fn default() -> Self {
        Config {                                                                                                                                                                                                         
            config_version: 1,
            local_choice: LocalConfig::Ollama,
            ollama_url: String::from("http://localhost:11434"),
            ollama_path: None
        }                                                                                                                                                                                                                
    }
}    

pub fn load_config(config_dir: PathBuf) -> Result<Config, Box<dyn std::error::Error>> {
    let config_path = config_dir.join("config.toml");

    if !config_path.exists() {
        let default = Config::default();
        save_config(config_dir, &default)?;  // write defaults to disk
        return Ok(default);
    }

    let contents = std::fs::read_to_string(config_path)?;
    let config: Config = toml::from_str(&contents)?;
    Ok(config)
}

pub fn save_config(config_dir: PathBuf, config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    let config_path = config_dir.join("config.toml");
    
    let contents = toml::to_string(config)?; 
    std::fs::create_dir_all(&config_dir)?; 
    std::fs::write(config_path, contents)?;         // text → disk
    Ok(())
}


pub fn find_ollama() -> Option<PathBuf> 
{
    if let Ok(path) = which::which("ollama")
    {
        return Some(path);
    }

    let mut candidates = Vec::new();

    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA")
    {
        candidates.push(
            PathBuf::from(local_app_data)
            .join("Programs")
            .join("Ollama")
            .join("ollama.exe")
        );
    }
    candidates.push(PathBuf::from(r"C:\Program Files\Ollama\ollama.exe"));

    candidates.into_iter().find(|path| path.exists())
}