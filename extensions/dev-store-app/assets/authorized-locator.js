// TOGGLE DROPDOWN
document.querySelectorAll(".dropdown").forEach(drop => {
    const btn = drop.querySelector(".dropdown-btn");

    btn.addEventListener("click", () => {
        document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
        drop.classList.toggle("active");
    });

    drop.querySelectorAll(".dropdown-list div").forEach(option => {
        option.addEventListener("click", () => {
            btn.innerText = option.innerText;
            drop.classList.remove("active");
        });
    });
});

// CLOSE ON OUTSIDE CLICK
document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
    }
});