// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::{
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::Path,
};
use serde::Serialize;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
#[allow(non_snake_case)]
fn listProjectDirectory(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let projects_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("projects");

    if !projects_dir.exists() {
        fs::create_dir_all(&projects_dir).map_err(|error| error.to_string())?;
        fs::write(
            projects_dir.join("sampleProject.scratcherr"),
            include_bytes!("../../src/sampleProjects/sampleProject.scratcherr"),
        )
        .map_err(|error| error.to_string())?;
    }

    let mut projects = fs::read_dir(projects_dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|file_type| file_type.is_file()))
        .filter(|entry| entry.path().extension().is_some_and(|extension| extension == "scratcherr"))
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    projects.sort();

    Ok(projects)
}

#[derive(Serialize)]
struct ProjectDetails {
    path: String,
    detail: serde_json::Value,
    icon: Option<Vec<u8>>,
}

#[tauri::command]
#[allow(non_snake_case)]
fn getProjectDetails(
    app: tauri::AppHandle,
    project_name: String,
) -> Result<ProjectDetails, String> {
    let file_name = Path::new(&project_name)
        .file_name()
        .filter(|file_name| file_name.to_str() == Some(project_name.as_str()))
        .ok_or_else(|| "Invalid project filename".to_string())?;
    if Path::new(file_name).extension().is_none_or(|extension| extension != "scratcherr") {
        return Err("Invalid project filename".to_string());
    }

    let project_path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("projects")
        .join(file_name);
    let mut archive = zip::ZipArchive::new(fs::File::open(&project_path).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    let mut detail_file = archive
        .by_name("detail.json")
        .map_err(|error| error.to_string())?;
    let mut contents = String::new();
    detail_file
        .read_to_string(&mut contents)
        .map_err(|error| error.to_string())?;
    drop(detail_file);
    let detail = serde_json::from_str(&contents).map_err(|error| error.to_string())?;
    let icon = match archive.by_name("icon.png") {
        Ok(mut icon_file) => {
            let mut icon = Vec::new();
            icon_file
                .read_to_end(&mut icon)
                .map_err(|error| error.to_string())?;
            Some(icon)
        }
        Err(zip::result::ZipError::FileNotFound) => None,
        Err(error) => return Err(error.to_string()),
    };

    Ok(ProjectDetails {
        path: project_path.to_string_lossy().into_owned(),
        detail,
        icon,
    })
}

#[tauri::command]
#[allow(non_snake_case)]
fn saveProject(
    app: tauri::AppHandle,
    project_name: String,
    archive: Vec<u8>,
) -> Result<String, String> {
    let file_stem = project_name.trim().replace(' ', "-");
    if file_stem.is_empty()
        || file_stem
            .chars()
            .any(|character| character.is_control() || "<>:\"/\\|?*".contains(character))
    {
        return Err("Project name contains invalid filename characters".to_string());
    }

    let projects_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("projects");
    fs::create_dir_all(&projects_dir).map_err(|error| error.to_string())?;

    let mut suffix = 1u32;
    loop {
        let file_name = if suffix == 1 {
            format!("{file_stem}.scratcherr")
        } else {
            format!("{file_stem}-{suffix}.scratcherr")
        };
        let project_path = projects_dir.join(&file_name);
        let result = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&project_path);

        match result {
            Ok(mut file) => {
                if let Err(error) = file.write_all(&archive) {
                    drop(file);
                    let _ = fs::remove_file(&project_path);
                    return Err(error.to_string());
                }
                return Ok(file_name);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                suffix += 1;
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            listProjectDirectory,
            getProjectDetails,
            saveProject
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
