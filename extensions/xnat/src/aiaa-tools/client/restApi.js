import axios from 'axios';

function constructFormData(params, file) {
  let formData = new FormData();
  if (file) {
    if (Array.isArray(file)) {
      for (let i = 0; i < file.length; i++) {
        formData.append('image' + i, file[i].data, file[i].name);
      }
    } else {
      formData.append('image', file.data, file.name);
    }
  }
  formData.append('params', JSON.stringify(params));
  return formData;
}

function constructFormOrJsonData(params, file) {
  return (file) ? constructFormData(params, file) : params;
}

function api_get(url) {
  console.info('AIAAUtils - GET:: ' + url);
  return axios
    .get(url)
    .then(function(response) {
      console.info(response);
      return response;
    })
    .catch(function(error) {
      return error;
    })
    .finally(function() {
    });
}

function api_post_file(url, params, file) {
  console.info('AIAAUtils - POST:: ' + url);
  let formData = constructFormData(params, file);
  return axios
    .post(url, formData, {
      responseType: 'arraybuffer', // direct receive as buffer array

      headers: {
        accept: 'multipart/form-data',
      },
    })
    .then(function(response) {
      console.info(response);
      return response;
    })
    .catch(function(error) {
      return error;
    })
    .finally(function() {
    });
}

function api_put(url, params, file) {
  console.info('AIAAUtils - PUT:: ' + url);
  let data = constructFormOrJsonData(params, file);
  return axios
    .put(url, data, {
      responseType: 'json',
      headers: {
        accept: 'application/json',
      },
    })
    .then(function(response) {
      console.info(response);
      return response;
    })
    .catch(function(error) {
      return error;
    });
}

export {
  api_get,
  api_post_file,
  api_put,
};