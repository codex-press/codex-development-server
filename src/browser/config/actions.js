import { api } from '../utility';
import * as env from '../env';

import * as actions  from '../actions';

export const REQUEST_TOKEN = 'REQUEST_TOKEN';
export const RECEIVE_TOKEN = 'RECEIVE_TOKEN';
export const SET_TOKEN_STATUS = 'SET_TOKEN_STATUS';
export const IMPERSONATE = 'IMPERSONATE';

export const FETCH_CONFIG = 'FETCH_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const CHANGE_CONFIG = 'CHANGE_CONFIG';
export const ADD_REPOSITORY = 'ADD_REPOSITORY';
export const REMOVE_REPOSITORY = 'REMOVE_REPOSITORY';
export const CHANGE_REPOSITORY = 'CHANGE_REPOSITORY';

export const FETCH_ACCOUNT = 'FETCH_ACCOUNT';
export const RECEIVE_ACCOUNT = 'RECEIVE_ACCOUNT';

export const FETCH_DOMAINS = 'FETCH_DOMAINS';
export const RECEIVE_DOMAINS = 'RECEIVE_DOMAINS';

export const FETCH_USERS = 'FETCH_USERS';
export const RECEIVE_USERS = 'RECEIVE_USERS';



// TOKEN

export function requestToken(email, password) {
  return async dispatch => {

    dispatch({ type: REQUEST_TOKEN, email });

    dispatch(setTokenStatus('pending'));

    try {
      let opts = { method: 'post', body: { email, password } };
      let { token } = await api(env.apiOrigin + '/token', opts)
      dispatch(receiveToken(token));
    }
    catch (error) {
      if (error.status === 423)
        dispatch(setTokenStatus('locked'));
      else
        dispatch(setTokenStatus('rejected'));
    }

  }
}


export function receiveToken(value) {
  return async dispatch => {
    dispatch({ type: RECEIVE_TOKEN, value });
    dispatch(setTokenStatus('valid'));
    dispatch(saveConfig());
    dispatch(fetchDomains());
    let account = await dispatch(fetchAccount());
    dispatch(actions.createCable(value, account.id));
    dispatch(actions.clearCommits());
  }
}


export function setTokenStatus(value) {
  return {
    type: SET_TOKEN_STATUS,
    value,
  };
}

export function impersonate(id) {
  return async (dispatch, getState) => {
    dispatch({ type: IMPERSONATE, id });
    let opts = { method: 'post', token: getState().getIn(['config','token']) };
    let endpoint = env.apiOrigin + `/admin/accounts/${ id }/impersonate`;
    let { token } = await api(endpoint, opts);
    dispatch(receiveToken(token));
  }
}



// CONFIG

export function fetchConfig() {
  return async dispatch => {
    dispatch({ type: FETCH_CONFIG });
    let config = await api('/api/config');
    dispatch(receiveConfig(config));
    return config;
  }
}

export function saveConfig() {
  return async (dispatch, getState) => {
    dispatch({ type: SAVE_CONFIG });
    let body = getState().getIn(['config']);
    return await api('/api/config', {method: 'post', body })
  }
}

export function receiveConfig(data) {
  return async dispatch => {
    dispatch({ type: RECEIVE_CONFIG, data });
    if (data.token)
      dispatch(actions.setTokenStatus('valid'));
    else
      dispatch(actions.setTokenStatus('invalid'));
  }
}

export function changeConfig(prop, value) {
  return async dispatch => {
    dispatch({ type: CHANGE_CONFIG, prop, value });
    dispatch(saveConfig());
  }
}

export function addRepository(name, path) {
  return async dispatch => {

    dispatch({
      type: ADD_REPOSITORY,
      name,
      path,
    });

    await dispatch(saveConfig());
    return await dispatch(actions.fetchRepositories());
  }
}

export function removeRepository(name) {
  return async dispatch => {

    dispatch({
      type: REMOVE_REPOSITORY,
      name,
    });

    await dispatch(saveConfig());
    return await dispatch(actions.fetchRepositories());
  }
}

export function changeRepository(currentName, name, path) {
  return async dispatch => {

    dispatch({
      type: CHANGE_REPOSITORY,
      currentName,
      name,
      path,
    });

    await dispatch(saveConfig());
    return await dispatch(actions.fetchRepositories());
  }
}





// ACCOUNT

export function fetchAccount() {
  return async (dispatch, getState) => {
    let token = getState().getIn(['config','token']);

    try {
      let account = await api(env.apiOrigin + '/account', { token });
      dispatch(receiveAccount(account));
      if (account.impersonator)
        dispatch(fetchUsers());
      return account
    }
    catch (error) {
      console.log(error);
      // if (error.status === 401) {
      //   // should send an alert here ?
      //   yield put(actions.receiveToken(null));
      //   yield put(actions.setTokenStatus('invalid'));
      // }
      // else
      //   console.error(error);
    }
  }
}

export function receiveAccount(data) {
  return {
    type: RECEIVE_ACCOUNT,
    data,
  }
}




// DOMAINS

export function fetchDomains() {
  return async (dispatch, getState) => {
    let token = getState().getIn(['config','token']);
    let domains = await api(env.apiOrigin + '/domains', { token });
    dispatch(receiveDomains(domains));
  }
}

export function receiveDomains(data) {
  return {
    type: RECEIVE_DOMAINS,
    data,
  }
}






// USERS

export function fetchUsers() {
  return async (dispatch, getState) => {
    dispatch({ type: FETCH_USERS });
    let token = getState().getIn(['config','token']);
    let endpoint = env.apiOrigin + '/admin/accounts?type=Editor'
    let users = await api(endpoint, { token });
    dispatch(receiveUsers(users));
  }
}

export function receiveUsers(data) {
  return {
    type: RECEIVE_USERS,
    data,
  }
}


