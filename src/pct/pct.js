const baseProject = "/sampleProjects/sampleProject.scratcherr"
let baseProjectContents
let iconObjectUrl

function genIcon(array) {
    if (iconObjectUrl) URL.revokeObjectURL(iconObjectUrl)
    iconObjectUrl = URL.createObjectURL(new Blob([array], { type: "image/png" }))
    const icon = iconObjectUrl
    document.getElementById("icon").src = icon
    return icon
}

function populateForm(detail) {
    document.getElementById("projectName").value = detail.name ?? ""

    for (const [key, value] of Object.entries(detail.settings ?? {})) {
        if (key === "stageSize") {
            document.getElementById("stageSizeX").value = value[0] ?? ""
            document.getElementById("stageSizeY").value = value[1] ?? ""
            continue
        }

        const input = document.getElementById(key)
        if (!input) continue

        if (input.type === "checkbox") {
            input.checked = value === true
        } else {
            input.value = value ?? ""
        }
    }
}

function getFormDetail() {
    const detail = JSON.parse(new TextDecoder().decode(baseProjectContents["detail.json"]))
    detail.name = document.getElementById("projectName").value.trim()
    detail.settings ??= {}

    for (const [key, value] of Object.entries(detail.settings)) {
        if (key === "stageSize") {
            const width = document.getElementById("stageSizeX")
            const height = document.getElementById("stageSizeY")
            if (!width.value || !height.value || !width.validity.valid || !height.validity.valid) {
                throw new Error("Enter valid stage dimensions before saving.")
            }
            detail.settings[key] = [width.valueAsNumber, height.valueAsNumber]
            continue
        }

        const input = document.getElementById(key)
        if (!input) continue

        if (input.type === "checkbox") {
            detail.settings[key] = input.checked
        } else if (input.type === "number") {
            if (!input.value || !input.validity.valid) {
                throw new Error(`Enter a valid value for ${key} before saving.`)
            }
            detail.settings[key] = input.valueAsNumber
        } else {
            detail.settings[key] = input.value
        }
    }

    return detail
}

document.getElementById("save").addEventListener("click", async () => {
    const saveButton = document.getElementById("save")
    saveButton.disabled = true

    try {
        const detail = getFormDetail()
        const files = {
            ...baseProjectContents,
            "detail.json": new TextEncoder().encode(JSON.stringify(detail, null, 4)),
        }
        const projectArchive = new JSZip()
        for (const [path, contents] of Object.entries(files)) {
            projectArchive.file(path, contents)
        }

        const archiveBytes = await projectArchive.generateAsync({ type: "uint8array" })
        await window.__TAURI__.core.invoke("saveProject", {
            projectName: detail.name,
            archive: Array.from(archiveBytes),
        })
        window.location.href = "/"
    } catch (error) {
        alert(`Unable to save project: ${error.message ?? error}`)
    } finally {
        saveButton.disabled = false
    }
})

document.getElementById("new").addEventListener("click", async () => {
    document.getElementById("intro").style.display = "none"

    const response = await fetch(baseProject, { method: "GET" })
    if (!response.ok) {
        throw new Error(`Failed to fetch base project: ${response.status}`)
    }

    const archive = await JSZip.loadAsync(await response.arrayBuffer())
    baseProjectContents = Object.fromEntries(await Promise.all(
        Object.entries(archive.files)
            .filter(([, entry]) => !entry.dir)
            .map(async ([path, entry]) => [path, await entry.async("uint8array")])
    ))
    document.getElementById("pctOutIntro").style.display = "block"
    console.log(baseProjectContents)
    const detail = JSON.parse(new TextDecoder().decode(baseProjectContents["detail.json"]))
    populateForm(detail)
    genIcon(baseProjectContents["icon.png"])
    document.getElementById("iconUpload").addEventListener("click", () => {
        const fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.accept = "image/png,.png"
        fileInput.addEventListener("change", async () => {
            const file = fileInput.files[0]
            if (!file) return

            const icon = new Uint8Array(await file.arrayBuffer())
            const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
            if (!pngSignature.every((byte, index) => icon[index] === byte)) {
                alert("Please select a PNG file.")
                return
            }

            baseProjectContents["icon.png"] = icon
            genIcon(icon)
        })
        fileInput.click()
    })
    document.getElementById("projectUpload").addEventListener("click", () => {
        const fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.accept = ".sb3"
        fileInput.addEventListener("change", async () => {
            const file = fileInput.files[0]
            if (!file) return

            const project = new Uint8Array(await file.arrayBuffer())
            const zipSignature = [0x50, 0x4b, 0x03, 0x04]
            if (!file.name.toLowerCase().endsWith(".sb3") || !zipSignature.every((byte, index) => project[index] === byte)) {
                alert("Please select a valid .sb3 file.")
                return
            }

            baseProjectContents["project/main.sb3"] = project
        })
        fileInput.click()
    })
})