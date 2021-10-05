function openMenu() {
  document.querySelector(".navbar-bottom").removeAttribute("hidden");

  document.querySelector(".close").removeAttribute("hidden");
  document.querySelector(".open").setAttribute("hidden", true);
}

function closeMenu() {
  document.querySelector(".navbar-bottom").setAttribute("hidden", true);

  document.querySelector(".open").removeAttribute("hidden");
  document.querySelector(".close").setAttribute("hidden", true);
}
