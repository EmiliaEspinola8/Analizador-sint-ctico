const buttons = document.querySelectorAll(".buttons");
const output = document.querySelector(".output");
const estado = document.querySelector(".state");
const regex = /^[01]+(\s*[+-]\s*[01]+)*$/;
document.addEventListener('click', (e)=>{
    if(e.target.classList.contains("buttons")){
        concatenar(e.target.value);
    }
})
const concatenar = (valor) => {
    if(valor == "eliminar"){
        output.value = output.value.slice(0,-1);
    }else if(valor == "comenzar"){
        output.value = "";
    }else{
        output.value += valor;
    }
    analizar();
}

const analizar = ()=>{
    estado.textContent = regex.test(output.value) ? "Aceptado" : "Rechazado";
}