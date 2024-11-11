import axios from 'axios';

export const registerHeadler = async (user) => {
  

  return await axios.post(process.env.REACT_APP_API + '/register', user, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const LoginHeadler = async (user) => {
  return await axios.post(process.env.REACT_APP_API + '/login', user, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function currentUser(authtoken) {
  return await axios.post(process.env.REACT_APP_API + '/current-user',
    {}, {
    headers: {
      authtoken
    }
  });
}

export async function currentAdmin(authtoken) {
  return await axios.post(process.env.REACT_APP_API + '/current-admin',
    {}, {headers: {authtoken}});
}




