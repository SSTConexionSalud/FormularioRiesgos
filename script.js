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
      encuestadorInput.readOnly = true // Hacer el campo de solo lectura
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

          // Crear una copia del formulario para el PDF
          const formContent = document.getElementById("formContainer").cloneNode(true)

          // Eliminar elementos que no deben aparecer en el PDF
          const submitBtn = formContent.querySelector(".form-actions")
          if (submitBtn) submitBtn.remove()

          const loadingOverlay = formContent.querySelector("#loadingOverlay")
          if (loadingOverlay) loadingOverlay.remove()

          const successMessage = formContent.querySelector("#successMessage")
          if (successMessage) successMessage.remove()

          // Preparar el contenido para el PDF
          const pdfContainer = document.createElement("div")
          pdfContainer.className = "pdf-container"

          // Aplicar estilos específicos para el PDF
          const style = document.createElement("style")
          style.textContent = `
            @page {
              margin: 10mm;
            }
            .pdf-container {
              font-family: Arial, sans-serif;
              color: black;
              width: 100%;
            }
            .pdf-container .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 15px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .pdf-container .header-title {
              flex: 3;
            }
            .pdf-container .header-info {
              flex: 1;
              text-align: right;
            }
            .pdf-container h1 {
              font-size: 16px;
              margin: 0 0 10px 0;
            }
            .pdf-container h2 {
              font-size: 14px;
              margin: 10px 0;
            }
            .pdf-container h3 {
              font-size: 12px;
              margin: 8px 0;
            }
            .pdf-container p {
              margin: 5px 0;
            }
            .pdf-container .form-row {
              display: flex;
              gap: 10px;
              margin-bottom: 10px;
            }
            .pdf-container .form-group {
              flex: 1;
            }
            .pdf-container label {
              display: block;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .pdf-container input, 
            .pdf-container select, 
            .pdf-container textarea {
              width: 100%;
              padding: 3px;
              border: 1px solid #000;
            }
            .pdf-container table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .pdf-container th, 
            .pdf-container td {
              border: 1px solid #000;
              padding: 4px;
              text-align: left;
              font-size: 10px;
            }
            .pdf-container th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .pdf-container .section {
              margin-bottom: 15px;
            }
            .pdf-container .activities-section {
              display: flex;
              gap: 15px;
            }
            .pdf-container .activities-column {
              flex: 1;
            }
          `

          // Añadir el estilo y el contenido al contenedor
          pdfContainer.appendChild(style)
          pdfContainer.appendChild(formContent)

          // Añadir temporalmente al documento para generar el PDF
          document.body.appendChild(pdfContainer)

          // Configurar opciones para html2pdf
          const opt = {
            margin: [10, 10, 10, 10],
            filename: fileName,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
              scale: 2,
              letterRendering: true,
              useCORS: true,
            },
            jsPDF: {
              unit: "mm",
              format: "a4",
              orientation: "portrait",
              compress: true,
            },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] },
          }

          // Generar el PDF
          window
            .html2pdf()
            .from(pdfContainer)
            .set(opt)
            .save()
            .then(() => {
              // Eliminar el contenedor temporal
              document.body.removeChild(pdfContainer)
              console.log("PDF generado correctamente")
              resolve()
            })
            .catch((error) => {
              // Eliminar el contenedor temporal en caso de error
              if (document.body.contains(pdfContainer)) {
                document.body.removeChild(pdfContainer)
              }
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

