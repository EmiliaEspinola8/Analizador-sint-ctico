const buttons = document.querySelectorAll(".buttons");
const output = document.querySelector(".output");
const estado = document.querySelector(".state");

buttons.forEach(boton => {
    boton.addEventListener('click', (e)=>{
        const valor = e.target.value;
        Concatenar(valor);
    })
});

const Concatenar = (valor)=>{
    if(valor == "eliminar"){
        arreglo = output.value.split("");
        arreglo.pop();
        texto = arreglo.join("");
        output.value = texto;
    }else if(valor == "comenzar"){
        output.value = "";
    }else{
        output.value = output.value + valor;
    }
    Analizar();
}

const Analizar = ()=>{
        const analizador = /^[01]+(\s*[+-]\s*[01]+)*$/.test(output.value);
        if(analizador){
            estado.textContent = "Aceptado";
        }else{
            estado.textContent = "Rechazado";
        }
}