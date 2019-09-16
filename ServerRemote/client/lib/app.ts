import { E, setUpdateCallback } from "./browserUtils"

window.addEventListener("load", () => {
	setUpdateCallback(() => {
		E.console.style.flexBasis = E.console.style.width;
	})
})