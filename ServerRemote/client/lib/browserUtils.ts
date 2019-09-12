
export var E: { [index: string]: HTMLElement } = {}

export function reloadElements() {
	document.querySelectorAll("[id]").forEach(v => {
		E[v.id] = v as unknown as HTMLElement;
	})
}

window.addEventListener("load", () => {
	reloadElements();
})


export function saveFile(src : string, name = "", type = null) {
	if (type) {
		var newSrc = "data:" + type + "," + encodeURIComponent(src);
		src = newSrc
	}
	var a = document.createElement("a")
	a.download = name
	a.href = src
	a.click()
}

export function loadFile(acceptString = "image/*", multiple = false, input = document.createElement("input")) : Promise<File[]> {
	return new Promise((resolve, reject) => {
		input.type = "file"
		input.accept = acceptString
		input.multiple = multiple
		var onchange = function (event) {
			var files : File[] = [...((input.files as unknown) as File[])]
			if (input.value == "") {
				reject([])
			} else {
				resolve(files)
			}
			input.removeEventListener("change", onchange)
			input.value = ""
		}
		input.addEventListener("change", onchange)
		input.click()

	})
}