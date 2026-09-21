(()=>{
  const form=document.querySelector('#loginForm');
  const email=document.querySelector('#email');
  const password=document.querySelector('#password');
  const message=document.querySelector('#msg');
  const loginButton=document.querySelector('#login-submit');
  const anonymousButton=document.querySelector('#anonymous');
  const buttons=[loginButton,anonymousButton];
  function setBusy(busy,label=''){
    buttons.forEach(button=>button.disabled=busy);
    if(label){message.textContent=label;message.className='form-message'}
  }
  function show(error){
    message.textContent=BioUI.friendlyError(error);
    message.className='form-message error-text';
  }
  function values(){
    if(!email.reportValidity()||!password.reportValidity())return null;
    return{email:email.value.trim().toLowerCase(),password:password.value};
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();const credentials=values();if(!credentials)return;
    setBusy(true,'Entrando…');
    try{
      const{error}=await BioUI.withTimeout(sb.auth.signInWithPassword(credentials));
      if(error)throw error;location.href='../';
    }catch(error){setBusy(false);show(error)}
  });
  anonymousButton.addEventListener('click',async()=>{
    setBusy(true,'Abrindo acesso de consulta…');
    try{
      const{error}=await BioUI.withTimeout(sb.auth.signInAnonymously());
      if(error)throw error;location.href='../';
    }catch(error){setBusy(false);show(error)}
  });
})();
