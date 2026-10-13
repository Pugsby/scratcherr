const projectList = document.getElementById("projectList");
const { invoke, convertFileSrc } = window.__TAURI__.core;
function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) {
		return parts.pop().split(';').shift();
	}
	return null;
}
function setCookie(name, value) {
	const expires = new Date(Date.now() + 1e10).toUTCString();
	document.cookie = name + "=" + encodeURIComponent(value) +
	"; expires=" + expires + "; path=/";
}
var username = getCookie("username") || ""
var usernameInput = document.getElementById("usernameInput")
usernameInput.value = username
usernameInput.addEventListener('change', () => {
	username = usernameInput.value
	setCookie("username", username)
})
const addProjectButton = document.getElementById("addProject");
addProjectButton.addEventListener("click", () => {
	const fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.accept = ".scratcherr";
	fileInput.addEventListener("change", async () => {
		const file = fileInput.files[0];
		if (!file) return;

		try {
			const archive = new Uint8Array(await file.arrayBuffer());
			const zipSignature = [0x50, 0x4b, 0x03, 0x04];
			if (!file.name.toLowerCase().endsWith(".scratcherr") || !zipSignature.every((byte, index) => archive[index] === byte)) {
				throw new Error("Select a valid .scratcherr project archive.");
			}

			addProjectButton.disabled = true;
			await invoke("saveProject", {
				projectName: file.name.slice(0, -".scratcherr".length),
				archive: Array.from(archive),
			});
			await loadProjectList();
		} catch (error) {
			alert(`Unable to add project: ${error.message ?? error}`);
		} finally {
			window.location.reload();
		}
	});
	fileInput.click();
});
async function loadProjectList() {
	projectList.replaceChildren();

	try {
		const projectNames = await invoke("listProjectDirectory");

		for (const projectName of projectNames) {
			try {
				const { path, detail, icon } = await invoke("getProjectDetails", { projectName });
				const projectUrl = convertFileSrc(path);
				const iconUrl = icon ? URL.createObjectURL(new Blob([Uint8Array.from(icon)], { type: "image/png" })) : null;

				for (const [filePath, fileDetails] of Object.entries(detail.files || {})) {
					if (!filePath.toLowerCase().endsWith(".sb3")) continue;

					const link = document.createElement("div");
					const query = new URLSearchParams({
						project: projectUrl,
						file: filePath,
						projectName: detail.name,
					});
                    link.addEventListener('click', () => {
                        document.getElementById("sidebar").innerHTML = `<p>${detail.name}</p><br>
                        <a href="/projectRunner/?${query}"><button>Play</button></a>`
                    });
                    link.classList.add("project");
                    if (iconUrl) {
						const image = document.createElement("img");
						image.src = iconUrl;
						image.alt = "";
						image.style.objectFit = "contain";
						image.style.verticalAlign = "middle";
						link.append(image, document.createTextNode(" "));
					}
					projectList.append(link);
				}
			} catch (error) {
				console.error(`Unable to load project ${projectName}:`, error);
			}
		}
	} catch (error) {
		console.error("Unable to list projects:", error);
		projectList.textContent = "Unable to load projects.";
	}
}

loadProjectList();