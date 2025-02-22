(() => {
  const doc = document;
  const form = doc.querySelector(".ppdb-form");
  const progressSteps = doc.querySelectorAll(".progress-step");
  const progressLine = doc.querySelector(".progress-line");
  const storageKey = "ppdbFormData";
  const qsa = (sel, parent = form) => [...parent.querySelectorAll(sel)];
  // Format nomor WhatsApp: ubah 08 menjadi 628
  const formatWhatsAppNumber = (number) => {
    return number.startsWith("08") ? `62${number.slice(1)}` : number;
  };
  // Fungsi untuk mengambil data dari formulir secara otomatis
  const getFormData = () => {
    const formData = {};
    const formSteps = qsa(".form-step:not(.form-success)"); // Ambil semua step kecuali form-success
    const successStep = form.querySelector(".form-success");
    const confirmStepIndex = Array.from(formSteps).indexOf(successStep?.previousElementSibling);
    formSteps.forEach((step, index) => {
      // Abaikan step konfirmasi (step sebelum form-success)
      if (index !== confirmStepIndex) {
        const stepTitle = step.querySelector("h3")?.textContent.trim();
        if (stepTitle) {
          formData[stepTitle] = {};
          qsa(".form-group", step).forEach(group => {
            const label = group.querySelector(".form-label")?.textContent.trim();
            const input = group.querySelector("input, textarea, select");
            if (label && input) {
              const value = input.type === "radio"
                ? group.querySelector("input[type='radio']:checked")?.value
                : input.value.trim();
              if (value) formData[stepTitle][label] = value;
            }
          });
        }
      }
    });
    return formData;
  };
  // Fungsi untuk membuat pesan WhatsApp
  const createWhatsAppMessage = (formData) => {
    let message = `${configPPDB.messageWhatsapp}\n\n`; // Gunakan messageWhatsapp
    for (const [stepTitle, fields] of Object.entries(formData)) {
      message += `======= ${stepTitle.toUpperCase()} =======\n`;
      for (const [label, value] of Object.entries(fields)) {
        message += `*${label}*: ${value}\n`;
      }
      message += "\n"; // Tambahkan baris kosong antar section
    }
    return encodeURIComponent(message);
  };
  // Fungsi untuk membuka WhatsApp
  const openWhatsApp = () => {
    const formData = getFormData();
    const formattedNumber = formatWhatsAppNumber(configPPDB.nomorWhatsapp); // Gunakan nomorWhatsapp
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${createWhatsAppMessage(formData)}`;
    window.open(whatsappUrl, '_blank');
  };
  // Inisialisasi elemen formulir
  const initializeFormElements = () => {
    qsa("label:not(.form-check-label)").forEach(el => el.classList.add("form-label"));
    qsa("input:not(.form-check-input), textarea").forEach(el => el.classList.add("form-control"));
    qsa("input").forEach(el => el.hasAttribute("type") || el.setAttribute("type", "text"));
    qsa(".form-control-number").forEach(el => el.setAttribute("inputmode", "numeric"));
    qsa("input[data-example], textarea[data-example]").forEach(el => el.setAttribute("placeholder", el.dataset.example));
    qsa(".form-select").forEach(select => {
      const placeholder = select.getAttribute("aria-label") || "Pilih Opsi";
      const firstOption = doc.createElement("option");
      firstOption.textContent = placeholder;
      firstOption.setAttribute("value", "");
      firstOption.setAttribute("selected", "");
      select.prepend(firstOption);
    });
    qsa(".form-select option:not(:first-child)").forEach(el => el.value = el.value || el.textContent.trim());
    qsa(".form-group:not(.optional) input, .form-group:not(.optional) textarea, .form-group:not(.optional) select").forEach(el => el.setAttribute("required", ""));
    qsa(".form-group").forEach(group => {
      const label = group.querySelector("label");
      const input = group.querySelector("input:not([type='radio']), textarea, select");
      if (label && input) {
        const nameValue = label.textContent.trim().toUpperCase().replace(/\s+/g, "_");
        input.setAttribute("name", nameValue);
        label.setAttribute("for", nameValue);
        input.setAttribute("id", nameValue);
      }
    });
  };
  // Simpan data formulir ke localStorage
  const saveFormData = () => {
    const formData = {};
    qsa("input, textarea, select").forEach(el => {
      if (el.type === "radio" && el.checked) formData[el.name] = el.value;
      else if (el.type !== "radio") formData[el.name] = el.value;
    });
    localStorage.setItem(storageKey, JSON.stringify(formData));
  };
  // Muat data formulir dari localStorage
  const loadFormData = () => {
    const formData = JSON.parse(localStorage.getItem(storageKey));
    if (formData) {
      qsa("input, textarea, select").forEach(el => {
        if (formData[el.name]) {
          if (el.type === "radio" && el.value === formData[el.name]) el.checked = true;
          else if (el.type !== "radio") el.value = formData[el.name];
        }
      });
    }
  };
  // Hapus data formulir dari localStorage
  const clearFormData = () => localStorage.removeItem(storageKey);
  // Validasi langkah saat ini dan scroll ke input pertama yang tidak valid
  const isCurrentStepValid = () => {
    const currentStep = form.querySelector(".form-step.active");
    const inputs = qsa("input, textarea, select", currentStep);
    let isStepValid = true;
    inputs.forEach(input => {
      const isValid = input.checkValidity();
      input.classList.toggle("is-invalid", !isValid);
      if (!isValid && isStepValid) {
        // Scroll ke input pertama yang tidak valid
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        isStepValid = false; // Setelah menemukan input pertama yang tidak valid, hentikan pencarian
      }
    });
    return isStepValid;
  };
  // Perbarui progress indicator
  const updateProgress = (stepIndex) => {
    const maxStepIndex = progressSteps.length - 1;
    const clampedStepIndex = Math.min(stepIndex, maxStepIndex);
    progressSteps.forEach((step, index) => step.classList.toggle("active", index <= clampedStepIndex));
    progressLine.style.width = `${(clampedStepIndex / maxStepIndex) * 100}%`;
  };
  const scrollToActiveStep = () => {
    const activeStep = form.querySelector(".form-step.active");
    if (activeStep) {
      activeStep.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  // Pindah ke langkah berikutnya
  const goToNextStep = () => {
    if (!isCurrentStepValid()) return;
    const currentStep = form.querySelector(".form-step.active");
    const nextStep = currentStep.nextElementSibling;
    if (nextStep?.classList.contains("form-step")) {
      currentStep.classList.remove("active");
      nextStep.classList.add("active");
      const stepIndex = Array.from(form.querySelectorAll(".form-step")).indexOf(nextStep);
      updateProgress(stepIndex);
      scrollToActiveStep();
      if (nextStep.nextElementSibling?.classList.contains("form-success")) generateConfirmationTable();
    }
  };
  // Pindah ke langkah sebelumnya
  const goToPrevStep = () => {
    const currentStep = form.querySelector(".form-step.active");
    const prevStep = currentStep.previousElementSibling;
    if (prevStep?.classList.contains("form-step")) {
      currentStep.classList.remove("active");
      prevStep.classList.add("active");
      const stepIndex = Array.from(form.querySelectorAll(".form-step")).indexOf(prevStep);
      updateProgress(stepIndex);
      scrollToActiveStep();
    }
  };
  // Handle submit formulir
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Jika configPPDB.appsScript tidak valid, gunakan fungsi openWhatsApp
    if (!configPPDB.appsScript || !configPPDB.appsScript.startsWith("https://script.google.com/")) {
      openWhatsApp();
      return;
    }
    // Validasi langkah saat ini
    if (!isCurrentStepValid()) return;
    const submitButton = form.querySelector(".btn-submit");
    const originalHTML = submitButton.innerHTML;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Mengirim...`;
    submitButton.disabled = true;
    try {
      const response = await fetch(configPPDB.appsScript, { method: "POST", body: new FormData(form) });
      if (response.ok) {
        const currentStep = form.querySelector(".form-step.active");
        const successStep = form.querySelector(".form-success");
        if (currentStep && successStep) {
          currentStep.classList.remove("active");
          successStep.classList.add("active");
          updateProgress(progressSteps.length);
          scrollToActiveStep();
        }
      } else {
        console.error("Error!", response.statusText);
      }
    } catch (error) {
      console.error("Error!", error.message);
    } finally {
      submitButton.innerHTML = originalHTML;
      submitButton.disabled = false;
    }
  };
  // Handle input pada formulir
  const handleInput = (e) => {
    if (e.target.matches(".form-control-number")) e.target.value = e.target.value.replace(/\D/g, "");
    e.target.classList.toggle("is-invalid", e.target.value.trim() === "");
    saveFormData();
  };
  // Handle invalid input
  const handleInvalid = (e) => e.target.classList.add("is-invalid");
  // Generate tabel konfirmasi
  const generateConfirmationTable = () => {
    const tableContainer = form.querySelector(".ppdb-table");
    const table = doc.createElement("table");
    table.classList.add("table", "table-basic", "table-bordered");
    const tbody = doc.createElement("tbody");
    qsa(".form-step:not(.active) .form-group").forEach(group => {
      const label = group.querySelector(".form-label")?.textContent.trim();
      const input = group.querySelector("input, textarea, select");
      const value = input?.type === "radio" 
        ? group.querySelector("input[type='radio']:checked")?.nextElementSibling.textContent.trim() 
        : input?.value.trim();
      if (label && value) {
        const row = doc.createElement("tr");
        row.innerHTML = `<td>${label}</td><td>${value}</td>`;
        tbody.appendChild(row);
      }
    });
    table.appendChild(tbody);
    tableContainer.innerHTML = "";
    tableContainer.appendChild(table);
  };
  // Inisialisasi formulir
  const initializeForm = () => {
    initializeFormElements();
    loadFormData();
    form.addEventListener("click", (e) => {
      const button = e.target.closest(".btn-next, .btn-prev, .btn-confirm");
      if (button) {
        if (button.matches(".btn-next")) {
          goToNextStep();
        } else if (button.matches(".btn-prev")) {
          goToPrevStep();
        } else if (button.matches(".btn-confirm")) {
          openWhatsApp();
        }
      }
    });
    form.addEventListener("submit", handleSubmit);
    form.addEventListener("input", handleInput);
    form.addEventListener("invalid", handleInvalid, true);
    setTimeout(() => {
      form.classList.add("show");
      doc.querySelector(".ppdb-load")?.remove();
    }, 1000);
  };
  initializeForm();
})();
