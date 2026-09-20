(()=>{
  const TIMEOUT_MS=12000;
  const messages={
    'Invalid login credentials':'E-mail ou senha incorretos.',
    'Email not confirmed':'Confirme seu e-mail antes de entrar.',
    'User already registered':'Já existe uma conta com este e-mail.',
    'Password should be at least 6 characters':'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format':'Digite um e-mail válido.',
    'Anonymous sign-ins are disabled':'O acesso anônimo está indisponível no momento.',
    'Failed to fetch':'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
  };
  function escape(value){
    return String(value??'').replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[char]);
  }
  function friendlyError(error,fallback='Não foi possível concluir a operação.'){
    const raw=String(error?.message||error||'').trim();
    if(!raw)return fallback;
    if(messages[raw])return messages[raw];
    if(/duplicate key|unique constraint|profiles_group_call_unique_idx/i.test(raw)){
      return 'Esse número de chamada já está sendo usado neste grupo.';
    }
    if(/jwt|session|not authenticated/i.test(raw)){
      return 'Sua sessão expirou. Entre novamente para continuar.';
    }
    if(/timeout|tempo limite/i.test(raw)){
      return 'O servidor demorou para responder. Tente novamente.';
    }
    if(/row-level security|permission denied|not allowed/i.test(raw)){
      return 'Sua conta não tem permissão para realizar esta ação.';
    }
    return raw.length<=220?raw:fallback;
  }
  function withTimeout(value,ms=TIMEOUT_MS){
    let timer;
    return Promise.race([
      Promise.resolve(value),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo limite excedido.')),ms)})
    ]).finally(()=>clearTimeout(timer));
  }
  function photoUrl(value){
    if(!value)return '';
    try{
      const url=new URL(value);
      const allowed=url.origin==='https://fbniifpkiyafpuhpnbll.supabase.co'&&
        url.pathname.startsWith('/storage/v1/object/public/activity-photos/');
      return allowed?url.href:'';
    }catch{return ''}
  }
  window.BioUI={escape,friendlyError,withTimeout,photoUrl,TIMEOUT_MS};
})();
