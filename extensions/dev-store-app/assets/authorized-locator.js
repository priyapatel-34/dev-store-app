document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".dropdown").forEach(drop => {
        const btn = drop.querySelector(".dropdown-btn");

        btn.addEventListener("click", () => {
            const isActive = drop.classList.contains("active");
            document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
            if (!isActive) {
                drop.classList.add("active");
            }
        });

        drop.querySelectorAll(".dropdown-list div").forEach(option => {
            option.addEventListener("click", () => {
                btn.querySelector("span").classList.remove("placeholder");
                btn.querySelector("span").innerText = option.innerText;
                drop.classList.remove("active");
            });
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".dropdown")) {
            document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
        }
    });
});