(()=>{
  const form=document.querySelector('#loginForm');
  const email=document.querySelector('#email');
  const password=document.querySelector('#password');
  const message=document.querySelector('#msg');
  const loginButton=document.querySelector('#login-submit');
  const signupButton=document.querySelector('#signup');
  const anonymousButton=document.querySelector('#anonymous');
  const buttons=[loginButton,signupButton,anonymousButton];
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
  signupButton.addEventListener('click',async()=>{
    const credentials=values();if(!credentials)return;
    setBusy(true,'Criando conta…');
    try{
      const{data,error}=await BioUI.withTimeout(sb.auth.signUp({
        ...credentials,options:{emailRedirectTo:new URL('../',location.href).href}
      }));
      if(error)throw error;
      message.textContent=data.session?'Conta criada. Redirecionando…':'Conta criada. Confira seu e-mail para confirmar o acesso.';
      message.className='form-message success-text';
      if(data.session)setTimeout(()=>{location.href='../'},500);else setBusy(false);
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
