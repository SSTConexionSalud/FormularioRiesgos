document.addEventListener("DOMContentLoaded", () => {
  // Verificar si html2pdf está disponible
  if (typeof window.html2pdf === "undefined") {
    console.error("html2pdf no está disponible. Cargando manualmente...")

    // Cargar html2pdf manualmente
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js"
    script.onload = () => {
      console.log("html2pdf cargado correctamente")
      inicializarFormulario()
    }
    script.onerror = () => {
      alert("Error al cargar html2pdf. Por favor, recargue la página o contacte al administrador.")
      console.error("Error al cargar html2pdf")
    }
    document.head.appendChild(script)
  } else {
    console.log("html2pdf ya está disponible")
    inicializarFormulario()
  }

  function inicializarFormulario() {
    const form = document.getElementById("riskForm")
    const submitBtn = document.getElementById("submitBtn")
    const loadingOverlay = document.getElementById("loadingOverlay")
    const successMessage = document.getElementById("successMessage")
    const closeSuccessBtn = document.getElementById("closeSuccessBtn")

    // Precargar el nombre del encuestador
    const encuestadorInput = document.getElementById("encuestador")
    if (encuestadorInput) {
      encuestadorInput.value = "Guendy Milena Lizarazo"
      encuestadorInput.readOnly = true // Opcional: hacer el campo de solo lectura
    }

    // Establecer la fecha actual en el campo de fecha
    const fechaInput = document.getElementById("fecha")
    if (fechaInput) {
      const today = new Date().toISOString().split("T")[0]
      fechaInput.value = today
    }

    // Cerrar mensaje de éxito
    closeSuccessBtn.addEventListener("click", () => {
      successMessage.style.display = "none"
    })

    submitBtn.addEventListener("click", async () => {
      // Validar el formulario
      if (!validateForm()) {
        alert("Por favor complete todos los campos obligatorios y seleccione al menos una opción para cada actividad.")
        return
      }

      // Mostrar pantalla de carga
      loadingOverlay.style.display = "flex"

      try {
        // Generar y descargar PDF
        await generateAndDownloadPDF()

        // Mostrar mensaje de éxito
        loadingOverlay.style.display = "none"
        successMessage.style.display = "block"
      } catch (error) {
        console.error("Error al generar o descargar el PDF:", error)
        loadingOverlay.style.display = "none"
        alert("Error al generar el PDF: " + error.message)
      }
    })

    function validateForm() {
      // Validar campos personales
      const requiredFields = ["trabajador", "proceso", "cargo", "lugar", "horas", "fecha", "email", "telefono"]

      for (const field of requiredFields) {
        const input = document.getElementById(field)
        if (!input.value.trim()) {
          return false
        }
      }

      // Validar que al menos una actividad tenga datos
      let actividadCompleta = false
      for (let i = 1; i <= 10; i++) {
        const actividad = document.querySelector(`input[name="actividad_${i}"]`)
        const rutinariaSi = document.querySelector(`input[name="rutinaria_${i}"][value="SI"]`)
        const rutinariaNo = document.querySelector(`input[name="rutinaria_${i}"][value="NO"]`)
        const peligrosaSi = document.querySelector(`input[name="peligrosa_${i}"][value="SI"]`)
        const peligrosaNo = document.querySelector(`input[name="peligrosa_${i}"][value="NO"]`)

        if (actividad && actividad.value.trim() !== "") {
          if ((rutinariaSi && rutinariaSi.checked) || (rutinariaNo && rutinariaNo.checked)) {
            if ((peligrosaSi && peligrosaSi.checked) || (peligrosaNo && peligrosaNo.checked)) {
              actividadCompleta = true
              break
            }
          }
        }
      }

      if (!actividadCompleta) {
        return false
      }

      return true
    }

    async function generateAndDownloadPDF() {
      return new Promise((resolve, reject) => {
        try {
          // Verificar nuevamente si html2pdf está disponible
          if (typeof window.html2pdf === "undefined") {
            reject(new Error("html2pdf no está disponible"))
            return
          }

          // Obtener el nombre del trabajador para el nombre del archivo
          const trabajador = document.getElementById("trabajador").value
          const fileName = `formularioRiesgos-${trabajador}.pdf`

          // Clonar el contenido del formulario para el PDF
          const content = document.getElementById("formContainer").cloneNode(true)

          // Eliminar elementos que no deben aparecer en el PDF
          const submitBtn = content.querySelector(".form-actions")
          if (submitBtn) submitBtn.remove()

          const loadingOverlay = content.querySelector("#loadingOverlay")
          if (loadingOverlay) loadingOverlay.remove()

          const successMessage = content.querySelector("#successMessage")
          if (successMessage) successMessage.remove()

          // Opciones para html2pdf
          const opt = {
            margin: 10,
            filename: fileName,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          }

          // Generar el PDF
          window
            .html2pdf()
            .from(content)
            .set(opt)
            .save()
            .then(() => {
              console.log("PDF generado y descargado correctamente")
              resolve()
            })
            .catch((error) => {
              console.error("Error en html2pdf:", error)
              reject(error)
            })
        } catch (error) {
          console.error("Error en generateAndDownloadPDF:", error)
          reject(error)
        }
      })
    }
  }
})
