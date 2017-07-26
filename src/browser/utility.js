

export const isLocalhost = ['localhost','127.0.0.1'].includes(location.hostname);

export async function api(path, { method, query, body, token } = {}) {

  let request = {
    method: (method || 'GET').toUpperCase(),
    headers: { Accept: 'application/json' }
  };

  if (token)
    request.headers['Authorization'] = `Token token="${ token }"`;

  if (body instanceof FormData)
    request.body = body
  else if (body) {
    request.body = JSON.stringify(body)
    request.headers['Content-Type'] = 'application/json';
  }

  let queryString = '';
  if (query && Object.keys(query).length) {
    let pairs = Object.keys(query).map(k => {
      if (query[k] instanceof Array)
        return query[k].map(v => k + '[]=' + encodeURIComponent(v)).join('&')
      else
        return k + '=' + encodeURIComponent(query[k])
    })
    queryString = '?' + pairs.join('&')
  }
  
  let response;
  try {
    response = await fetch(path + queryString, request);
  }
  catch (error) {
    error.fetchError = true;
    throw error;
  }

  // we do this so that an empty body is returned as an empty object and
  // doesn't throw errors when you ask for JSON
  body = await response.text();
  let json = {};
  if (body) {
    try {
      json = JSON.parse(body);
    }
    catch (e) {
    }
  }

  if (response.ok)
    return json;
  else {
    if (body)
      response.json = json;
    throw response;
  }

}

export function addStylesheet(url, attrs = {}) {
  return new Promise((resolve, reject) => {
    let tag = document.createElement('link');
    tag.setAttribute('rel', 'stylesheet');
    Object.keys(attrs).map(k => tag.setAttribute(k, attrs[k]));
    tag.href = url;
    document.head.appendChild(tag);
    tag.onload = resolve;
    tag.onerror = reject;
  });
}


export function addScript(url, attrs = {}) {
  return new Promise((resolve, reject) => {
    let tag = document.createElement('script');
    Object.keys(attrs).map(k => tag.setAttribute(k, attrs[k]));
    tag.src = url;
    tag.async = false;
    document.head.appendChild(tag);
    tag.onload = resolve;
    tag.onerror = reject;
  });
}


export function debounce(time, func, context) {
  let timeout = null;
  return (...args) => {
    if (timeout)
      clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), time);
  }
}


export function openFileSystem(path) {
  api(`/api/open?path=${path}`, { method: 'post' });
}



export function domPath(el) {
  const path = [ el ]
  while (![null, document].includes(path[ path.length - 1 ].parentNode)) {
    path.push(path[ path.length - 1 ].parentNode);
  }
  return path;
}


