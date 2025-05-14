// Reusable function to load the header
function loadHeader(headerPlaceholderId) {
    fetch("/templates/header.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById(headerPlaceholderId).innerHTML = data;

            // Reset scroll position to the top of the page
            window.scrollTo(0, 0);
        })
        .catch(error => console.error("Error loading header:", error));
}