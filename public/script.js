const passkey = prompt("請輸入密鑰:");
while (passkey !== "cool-happy-cow") {
  alert("密鑰錯誤，請重新輸入!");
  passkey = prompt("請輸入密鑰:");
}

document.addEventListener('DOMContentLoaded', (event) => {
  fetch('/images-data')
    .then(response => response.json())
    .then(data => {
      const imagesDiv = document.getElementById('images');
      imagesDiv.innerHTML = '';

      data.forEach((item, index) => {
        const imageWrapper = document.createElement('div');
        imageWrapper.classList.add('image-wrapper');
        imageWrapper.setAttribute('data-id', item.id); 

        var doLazyLoad = index > 10;
        imageWrapper.innerHTML = getImageWrapperHTML(item.imageUrl, item.prompt, item.revisedPrompt, item.style, item.quality, item.id, item.model, doLazyLoad);

        imagesDiv.appendChild(imageWrapper);
      });
    })
    .catch(error => {
      console.error('Error fetching images:', error);
    });
});


document.getElementById('generate').addEventListener('click', function() {
  var prompt = document.getElementById('prompt').value;
  var style = document.getElementById('style').value;
  var size = document.getElementById('size').value;
  var quality = document.getElementById('quality').value;
  var useExactPrompt = document.getElementById('useExactPrompt').checked;

  if (!prompt) {
    alert('Please enter a prompt.');
    return;
  }

  if (useExactPrompt) {
    const promptPrefix = 'Please use this exact prompt, do not change it: ';
    if (!prompt.startsWith(promptPrefix)) {
      prompt = promptPrefix + prompt;
    }
  }

  var numImages = parseInt(document.getElementById('numImages').value, 10);

  Array.from({ length: numImages }, (_, i) => i + 1).forEach(function() {
    var imageWrapper = document.createElement('div');
    imageWrapper.classList.add('spinner');
    document.getElementById('images').prepend(imageWrapper);
  
    fetch('/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, style, size, quality })
    })
    .then(response => response.json())
    .then(data => {
      imageWrapper.classList.remove('spinner');
      imageWrapper.classList.add('image-wrapper');

      if (data.error) {
        imageWrapper.innerHTML = `<p class="error-wrapper">Oops, OpenAI says "${data.error.message}" (Code: ${data.error.code}).</p><p>Your prompt was "<strong>${prompt}</strong>", though the issue may also have been in the unknowable OpenAI-auto-revised prompt.</p>`;
      }
      else {
        imageWrapper.setAttribute('data-id', data.id); 
        imageWrapper.innerHTML = getImageWrapperHTML(data.imageUrl, prompt, data.revisedPrompt, style, quality, data.id, data.model, false);
      }
  
    })
    .catch(error => {
      console.log(error);
      imageWrapper.classList.remove('spinner');
      imageWrapper.innerHTML = `<p class="error-wrapper">Error generating image.</p>`;
    });
  });
});


document.addEventListener('click', function(event) {
  if (event.target.classList.contains('deleteButton')) {
    const confirmed = confirm('Delete image?');
    if (confirmed) {
      const imageWrapper = event.target.closest('.image-wrapper');
      const imageId = imageWrapper.getAttribute('data-id');
  
      fetch(`/delete-image/${imageId}`, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(data => {
        if (data.message === 'Image deleted') {
          imageWrapper.remove();
        } else {
          alert('Error deleting image');
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    }
  }
});


document.getElementById('images').addEventListener('click', function(event) {
  if (event.target.classList.contains('generatedImage')) {
    event.target.classList.toggle('fullSizeImage');
  }
});


function getImageWrapperHTML(imageUrl, prompt, revisedPrompt, style, quality, id, model, doLazyLoad) {
  const defaultModel = 'dall-e-3';

  if (quality == 'hd') { quality = quality.toUpperCase(); }

  var settingsInfo = capitalize(style) + " Style, " + capitalize(quality) + " Quality";
  if (model && model != defaultModel) { settingsInfo += ", Model: " + model; }

  if (!revisedPrompt) { revisedPrompt = "(none)"; }

  const loadingAttribute = doLazyLoad ? 'loading="lazy"' : '';
  return `
        <img src="${imageUrl}" alt="" ${loadingAttribute} id="image-${id}" class="generatedImage" data-angle="0">
        <p>${prompt}
          <br><button onclick="copyToClipboard(this)" class="copyToClipboard">📋 <span>copy prompt</span></button>
        </p>
        <p>${revisedPrompt}
          <br><button onclick="copyToClipboard(this)" class="copyToClipboard">📋 <span>copy revised prompt</span></button>
        </p>
        <p><span class="creationSettings">${settingsInfo}</span>
        <button onclick="rotateImage('image-${id}')" class="rotateButton imageButton" title="Rotates the view without changing the original">↻ Rotate</button>
        <button class="deleteButton imageButton" data-id="${id}" title="Permanently deletes image from disk and database">🗑 Delete</button>
        </p>
  `;
}

function rotateImage(id) {
  const image = document.getElementById(id);
  const currentAngle = image.getAttribute('data-angle') || '0';
  const newAngle = (parseInt(currentAngle) + 90) % 360;
  image.style.transform = `rotate(${newAngle}deg)`;
  image.setAttribute('data-angle', newAngle.toString());
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function copyToClipboard(btnElement) {
  const textToCopy = btnElement.parentNode.childNodes[0].nodeValue.trim();
  navigator.clipboard.writeText(textToCopy).then(() => {
      btnElement.classList.add('copy-success');
      setTimeout(() => btnElement.classList.remove('copy-success'), 1000);
  }).catch(err => {
      console.error('Failed to copy text to clipboard', err);
  });
}
