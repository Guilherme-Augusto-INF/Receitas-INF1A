(()=>{
const form=document.querySelector('#signupForm'),email=document.querySelector('#email'),password=document.querySelector('#password'),confirmPassword=document.querySelector('#confirmPassword'),message=document.querySelector('#msg'),button=document.querySelector('#signup-submit');
function show(text,error=false){message.textContent=text;message.className='form-message '+(error?'error-text':'success-text')}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!email.reportValidity()||!password.reportValidity()||!confirmPassword.reportValidity())return;
 if(password.value!==confirmPassword.value){show('As senhas não coincidem.',true);return}
 button.disabled=true;show('Criando conta…');
 try{
  const{data,error}=await BioUI.withTimeout(sb.auth.signUp({email:email.value.trim().toLowerCase(),password:password.value,options:{emailRedirectTo:new URL('../',location.href).href}}));
  if(error)throw error;
  if(data.session){show('Conta criada. Redirecionando…');setTimeout(()=>location.href='../',500)}
  else{show('Conta criada. Confira seu e-mail para confirmar o acesso.');button.disabled=false}
 }catch(error){show(BioUI.friendlyError(error),true);button.disabled=false}
});
})();