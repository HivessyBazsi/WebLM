use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Role {       // 1. Changed "role" to "Role"
    User,
    Assistant,
    System,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

#[derive(Deserialize, Debug)]
pub struct OllamaModel {
    pub name: String,
    pub model: String,
    pub size: u64,
}

#[derive(Deserialize, Debug)]
pub struct OllamaModelsResponse {
    pub models: Vec<OllamaModel>,
}

