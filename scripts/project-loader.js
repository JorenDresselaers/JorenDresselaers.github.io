function loadProjectData() {
    // Get the project ID from the URL (e.g., ?id=roguelike-prototype)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("id");

    if (!projectId) {
        console.error("No project ID specified in the URL.");
        return;
    }

    // Fetch the individual project JSON file
    fetch(`/data/projects/${projectId}.json`)
        .then(response => response.json())
        .then(project => {
            if (!project) {
                console.error(`Project with ID "${projectId}" not found.`);
                return;
            }

            // Populate the page with project data (e.g., title, video, sections)
            document.title = project.title;

            const projectContent = document.getElementById("project-content");

            // Add title
            const titleElement = document.createElement("h1");
            titleElement.textContent = project.title;
            projectContent.appendChild(titleElement);

            // Add video
            if (project.video) {
                const videoContainer = document.createElement("div");
                videoContainer.className = "video-container";
                videoContainer.innerHTML = `
                    <video controls style="max-height: 500px; width: auto; display: block; margin: 0 auto;">
                        <source src="${project.video}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
                projectContent.appendChild(videoContainer);
            }

            // Add general information and description
            if (project.generalInfo || project.sections) {
                const introSection = document.createElement("section");
                introSection.className = "intro-section";

                // Left column: General Information
                const generalInfoColumn = document.createElement("div");
                generalInfoColumn.className = "column";
                generalInfoColumn.innerHTML = `
                    <h2>General Information</h2>
                    <p><strong>Project Duration:</strong> ${project.generalInfo.duration}</p>
                    <p><strong>Engine:</strong> ${project.generalInfo.engine}</p>
                `;

                if (project.generalInfo.links && project.generalInfo.links.length > 0) {
                    generalInfoColumn.innerHTML += `
                        <p>Find more about this project on:</p>
                        <ul>
                            ${project.generalInfo.links
                                .map(link => `<li><a href="${link.url}" target="_blank">${link.name}</a></li>`)
                                .join("")}
                        </ul>
                    `;
                }

                // Right column: Detailed Description
                const descriptionColumn = document.createElement("div");
                descriptionColumn.className = "column";
                descriptionColumn.innerHTML = project.generalInfo.description
                    .map(desc => `
                        <h2>${desc.title}</h2>
                        <p>${desc.content.replace(/\n/g, "<br>")}</p>
                    `)
                    .join("");

                // Append columns to the intro section
                introSection.appendChild(generalInfoColumn);
                introSection.appendChild(descriptionColumn);

                // Append the intro section to the project content
                projectContent.appendChild(introSection);
            }

            // Add additional sections
            project.sections.forEach(section => {
                const sectionElement = document.createElement("div");
                sectionElement.className = "content-section";
                sectionElement.innerHTML = `
                    ${section.image ? `<img src="${section.image}" alt="${section.imageAlt || ''}">` : ''}
                    <div>
                        <h3>${section.title}</h3>
                        <p>${section.content.replace(/\n/g, "<br>")}</p>
                    </div>
                `;
                projectContent.appendChild(sectionElement);
            });
        })
        .catch(error => console.error("Error loading project data:", error));
}