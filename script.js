const buttons = document.querySelectorAll(".buttons");
const output = document.querySelector(".output");
const estado = document.querySelector(".state");

document.addEventListener('click', (e)=>{
    if(e.target.tagName === "BUTTON"){
        concatenar(e.target.value);
    }
})
document.addEventListener("keydown", ({ key }) => {
  const keys = new Set(["Enter", "Backspace", "0", "1", "+", "-"]);
  if (!keys.has(key)) return;
  concatenar(key === "Enter" ? "comenzar" : key === "Backspace" ? "eliminar" : key);
});
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
    const resultado = validarExpresionCalculadora(output.value, output);
    if(resultado.valida) {
        estado.textContent = "Aceptado";
    }else{
        estado.textContent = "Rechazado";
    }
}
