const urlParams = new URLSearchParams(window.location.search);
const project = urlParams.get('project');
const projectName = urlParams.get('projectName');
const file = urlParams.get('file') || '/project/main.sb3';
const iframe = document.getElementById('iframe');
iframe.src = "/turbowarp/index.html?" + new URLSearchParams({ project, file });

iframe.addEventListener('load', () => {
    const iframeDocument = iframe.contentDocument;
    if (!iframeDocument) return;

    iframeDocument.addEventListener('mousemove', (e) => {
        const rect = iframe.getBoundingClientRect();

        const x = e.clientX + rect.left + iframe.clientLeft;
        const y = e.clientY + rect.top + iframe.clientTop;

        const topbar = document.getElementById('topbar');
        if (y < 32) {
            topbar.style.transform = `translateY(0px)`;
        } else {
            topbar.style.transform = `translateY(-100%)`;
        }
    });
});

iframe.src = "/turbowarp/index.html?" + new URLSearchParams({ project, file });
document.getElementById("projectName").innerText = projectName || "Unknown Project";