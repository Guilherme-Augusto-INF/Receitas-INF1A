(()=>{
  const scriptUrl=document.currentScript?.src||location.href;
  const baseUrl=new URL('../',scriptUrl);
  window.BioAuth={
    baseUrl,
    async session(){
      try{
        const{data,error}=await BioUI.withTimeout(sb.auth.getSession());
        return{session:data?.session||null,error};
      }catch(error){return{session:null,error}}
    },
    async profile(){
      const current=await this.session();
      if(!current.session)return{profile:null,user:null,error:current.error};
      try{
        const{data,error}=await BioUI.withTimeout(
          sb.from('profiles').select('id,full_name,role,group_id,is_anonymous,call_number').eq('id',current.session.user.id).maybeSingle()
        );
        return{profile:data||null,user:current.session.user,error};
      }catch(error){return{profile:null,user:current.session.user,error}}
    },
    async requireSession(){
      const result=await this.session();
      if(!result.session){location.href=new URL('login/',baseUrl).href;return null}
      return result;
    },
    async signOut(){
      await sb.auth.signOut();
      location.href=baseUrl.href;
    }
  };
})();
