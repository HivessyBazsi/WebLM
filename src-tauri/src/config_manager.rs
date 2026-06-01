#[derive(Serialize, Deserialize)]
struct Config {
    ollama_url: String,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            ollama_url: String::from("http://localhost:11434"),
        }
    }
}

fn load_config() -> Result<Config, Box<dyn std::error::Error>> {
    Ok(Config::default())
}