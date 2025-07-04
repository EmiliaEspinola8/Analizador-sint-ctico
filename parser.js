const modal = document.getElementById('modalResultado');
const TokenType = {
    NUMERO: 'NUMERO',
    SUMA: 'SUMA',
    RESTA: 'RESTA',
    EOF: 'EOF'
};

class Token {
    constructor(tipo, valor, posicion) {
        this.tipo = tipo;
        this.valor = valor;
        this.posicion = posicion;
    }
    
    toString() {
        return `Token(${this.tipo}, ${this.valor}, ${this.posicion})`;
    }
}

class Lexer {
    constructor(texto) {
        this.texto = texto;
        this.posicion = 0;
    }
    
    tokenizar() {
        const tokens = [];
        
        while (this.posicion < this.texto.length) {
            const char = this.texto[this.posicion];
            
            if (/\s/.test(char)) {
                this.posicion++;
                continue;
            }
            
            if (/[01]/.test(char)) {
                const inicio = this.posicion;
                while (/[01]/.test(this.texto[this.posicion])) this.posicion++;
                tokens.push(new Token(TokenType.NUMERO, this.texto.slice(inicio, this.posicion), inicio));
            }

            else if (char === '+') {
                tokens.push(new Token(TokenType.SUMA, char, this.posicion));
                this.posicion++;
            }
            else if (char === '-') {
                tokens.push(new Token(TokenType.RESTA, char, this.posicion));
                this.posicion++;
            }
        }
        
        tokens.push(new Token(TokenType.EOF, '', this.posicion));
        return tokens;
    }
}

class NodoAST {
    mostrarEstructura(nivel = 0) {
        const indentacion = '  '.repeat(nivel);
        return `${indentacion}${this.toString()}`;
    }
}

class NodoNumero extends NodoAST {
    constructor(valor) {
        super();
        this.valor = valor;
    }
    
    toString() {
        return `Numero(${this.valor})`;
    }
    
    mostrarEstructura(nivel = 0) {
        const indentacion = '  '.repeat(nivel);
        return `${indentacion}├─ <numero>: ${this.valor}`;
    }
}

class NodoOperacion extends NodoAST {
    constructor(izquierdo, operador, derecho) {
        super();
        this.izquierdo = izquierdo;
        this.operador = operador;
        this.derecho = derecho;
    }
    
    toString() {
        return `Operacion(${this.izquierdo} ${this.operador} ${this.derecho})`;
    }
    
    mostrarEstructura(nivel = 0) {
        const indentacion = '  '.repeat(nivel);
        let resultado = `${indentacion}├─ <operador> ${this.operador}\n`;
        resultado += `${indentacion}  ├─ Izquierdo:\n`;
        resultado += `${this.izquierdo.mostrarEstructura(nivel + 2)}\n`;
        resultado += `${indentacion}  └─ Derecho:\n`;
        resultado += `${this.derecho.mostrarEstructura(nivel + 2)}`;
        return resultado;
    }
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.posicion = 0;
        this.tokenActual = this.tokens.length > 0 ? this.tokens[0] : null;
    }
    
    avanzar() {
        if (this.posicion < this.tokens.length - 1) {
            this.posicion++;
            this.tokenActual = this.tokens[this.posicion];
        }
    }
    
    parsear() {
        const ast = this.expresion();
        
        if (this.tokenActual && this.tokenActual.tipo !== TokenType.EOF) {
            throw new SyntaxError(`ERROR SINTÁCTICO: Simbolo inesperado '${this.tokenActual.valor}' en posición ${this.tokenActual.posicion}. Se esperaba fin de expresión.`);
        }
        
        return ast;
    }
    
    expresion() {
        let nodo = this.termino();
        
        while (this.tokenActual && 
               (this.tokenActual.tipo === TokenType.SUMA || 
                this.tokenActual.tipo === TokenType.RESTA)) {
            const operador = this.tokenActual.valor;
            this.avanzar();
            const derecho = this.termino();
            nodo = new NodoOperacion(nodo, operador, derecho);
        }
        
        return nodo;
    }
    
    termino() {
        if (!this.tokenActual) {
            throw new SyntaxError(`ERROR SINTÁCTICO: Se esperaba un número o pero se encontró fin de expresión.`);
        }
        if (this.tokenActual.tipo === TokenType.NUMERO) {
            const valor = this.tokenActual.valor;
            const posicion = this.tokenActual.posicion;
            
            if (!valor || valor.length === 0) {
                throw new SyntaxError(`ERROR SINTÁCTICO: Número binario vacío en posición ${posicion}.`);
            }
            
            this.avanzar();
            return new NodoNumero(valor);
        }
        else if (this.tokenActual.tipo === TokenType.SUMA || this.tokenActual.tipo === TokenType.RESTA) {
            throw new SyntaxError(`ERROR SINTÁCTICO: Operador en posición ${this.tokenActual.posicion} sin operando izquierdo. Se esperaba un número.`);
        }
        else {
            throw new SyntaxError(`ERROR SINTÁCTICO: Simbolo inesperado en posición ${this.tokenActual.posicion}. Se esperaba un número binario.`);
        }
    }
}

class EvaluadorBinario {
    evaluar(nodo) {
        if (nodo instanceof NodoNumero) {
            return nodo.valor;
        }
        else if (nodo instanceof NodoOperacion) {
            const izq = this.evaluar(nodo.izquierdo);
            const der = this.evaluar(nodo.derecho);
            
            const izqDecimal = parseInt(izq, 2);
            const derDecimal = parseInt(der, 2);
            
            let resultado;
            if (nodo.operador === '+') {
                resultado = izqDecimal + derDecimal;
            } else if (nodo.operador === '-') {
                resultado = izqDecimal - derDecimal;
            }
            
            return resultado.toString(2); 
        }
    }
}

function analizarExpresionBinaria(expresion) {
    try {
        const lexer = new Lexer(expresion);
        const tokens = lexer.tokenizar();
        
        const parser = new Parser(tokens);
        const ast = parser.parsear();
        
        const evaluador = new EvaluadorBinario();
        const resultado = evaluador.evaluar(ast);
        
        return {
            exito: true,
            tokens: tokens,
            ast: ast,
            resultado: resultado,
            expresionOriginal: expresion,
            posicionError: null,
            longitudError: null
        };
    } catch (error) {
        let posicionError = null;
        let longitudError = 1;
        
        const matchPosicion = error.message.match(/posición (\d+)/);
        if (matchPosicion) {
            posicionError = parseInt(matchPosicion[1]);
            if (error.message.includes('Número binario')) {
                let i = posicionError;
                while (i < expresion.length && (expresion[i] === '0' || expresion[i] === '1')) {
                    i++;
                }
                longitudError = Math.max(1, i - posicionError);
            }
        }
        
        return {
            exito: false,
            error: error.message,
            expresionOriginal: expresion,
            posicionError: posicionError,
            longitudError: longitudError,
            tipoError: error.constructor.name
        };
    }
}

function aplicarErrorVisual(inputElement, posicionError, longitudError = 1) {
    if (!inputElement || posicionError === null) return;
    if(inputElement.value.length == 0) return;
    limpiarErrorVisual(inputElement);
    
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'error-overlay';
    errorOverlay.style.position = 'absolute';
    errorOverlay.style.pointerEvents = 'none';
    errorOverlay.style.zIndex = '10';
    
    const inputRect = inputElement.getBoundingClientRect();
    const inputStyles = window.getComputedStyle(inputElement);
    const fontSize = parseFloat(inputStyles.fontSize);
    const fontFamily = inputStyles.fontFamily;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    const textoAntes = inputElement.value.substring(0, posicionError);
    const textoError = inputElement.value.substring(posicionError, posicionError + longitudError);
    
    const anchoAntes = ctx.measureText(textoAntes).width;
    const anchoError = ctx.measureText(textoError).width || fontSize * 0.6; 
    
    errorOverlay.style.left = (inputRect.left + anchoAntes + (anchoAntes === 0 ? 6 : -2)) + 'px';
    errorOverlay.style.top = (inputRect.bottom -10) + 'px';
    errorOverlay.style.width = Math.max(anchoError, fontSize * 0.9) + 'px';
    errorOverlay.style.height = '3px';
    errorOverlay.style.backgroundColor = '#ff4444';
    errorOverlay.style.borderRadius = '1px';
    errorOverlay.style.boxShadow = '0 0 4px rgba(255, 68, 68, 0.5)';
    
    errorOverlay.style.animation = 'errorPulse 0.6s ease-in-out';
    
    document.body.appendChild(errorOverlay);
    
    inputElement._errorOverlay = errorOverlay;
    
    setTimeout(() => {
        if (errorOverlay.parentNode) {
            errorOverlay.parentNode.removeChild(errorOverlay);
        }
    }, 5000);
}

function limpiarErrorVisual(inputElement) {
    if (inputElement._errorOverlay && inputElement._errorOverlay.parentNode) {
        inputElement._errorOverlay.parentNode.removeChild(inputElement._errorOverlay);
        inputElement._errorOverlay = null;
    }
}

function validarExpresionCalculadora(expresion, inputElement) {
    const resultado = analizarExpresionBinaria(expresion);
    mostrarResultado(resultado);
    if (!resultado.exito) {
        if(inputElement.value.length == 0) {
        modal.innerHTML = `<p style="font-size:16px">Escribe una expresion valida</p>`
        limpiarErrorVisual(inputElement);
        return
        };
        aplicarErrorVisual(inputElement, resultado.posicionError, resultado.longitudError);
        
        return {
            valida: false,
            error: resultado.error,
            posicion: resultado.posicionError,
            longitud: resultado.longitudError
        };
    } else {
        limpiarErrorVisual(inputElement);
        
        return {
            valida: true,
            resultado: resultado.resultado,
            resultadoDecimal: parseInt(resultado.resultado, 2),
            ast: resultado.ast
        };
    }
}
function mostrarResultado(resultado) {
    const arbolContainer = document.createElement('div');
    if (resultado.exito) {
        modal.innerHTML = `
            <p style="color: green; font-weight: bold; font-size: 16px; margin-bottom: 10px">Expresión Valida</p>
            <div>
                <p>Expresión Original: ${resultado.expresionOriginal}</p>
                <p>Expresión Binaria: ${resultado.resultado}</p>
                <p>Expresión Decimal: ${parseInt(resultado.resultado, 2)}</p>
            </div>
        
        `
        modal.appendChild(arbolContainer);
        renderizarArbol(resultado.ast, arbolContainer);
    } else {
        modal.innerHTML = `
            <p style="color: red; font-weight: bold; font-size: 16px;margin-bottom: 10px">Expresión Invalida</p>
            <p style="margin-bottom: 10px">${resultado.error}</p>

            <p style="font-weight: bold; font-size: 16px; margin-bottom: 5px">Sugerencias</p>
            ${resultado.error.includes('Se esperaba') ? '<p>Asegúrese de que cada operador tenga operandos</p>' : ''}
            ${resultado.error.includes('Carácter no válido') ? ' <p>Solo use dígitos binarios (0, 1)<p>' : ''}
        `
    }
}

function renderizarArbol(nodo, container) {
    const nodoDiv = document.createElement('div');
    nodoDiv.className = 'nodo-arbol';
    nodoDiv.textContent = nodo instanceof NodoNumero ? nodo.valor : nodo.operador;

    const contenedorHijos = document.createElement('div');
    contenedorHijos.className = 'contenedor-hijos';
    const wrapper = document.createElement('div');
    wrapper.className = 'nodo-wrapper';
    if (nodo instanceof NodoOperacion) {
        wrapper.classList.add('nodo-con-hijos');
        const izquierdo = document.createElement('div');
        renderizarArbol(nodo.izquierdo, izquierdo);

        const derecho = document.createElement('div');
        renderizarArbol(nodo.derecho, derecho);

        contenedorHijos.appendChild(izquierdo);
        contenedorHijos.appendChild(derecho);
    }
    wrapper.appendChild(nodoDiv);
    if (contenedorHijos.children.length > 0) {
        wrapper.appendChild(contenedorHijos);
    }

    container.appendChild(wrapper);
}
