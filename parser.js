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
            
            if (char === '0' || char === '1') {
                const inicio = this.posicion;
                while (this.posicion < this.texto.length && 
                       (this.texto[this.posicion] === '0' || this.texto[this.posicion] === '1')) {
                    this.posicion++;
                }
                const numero = this.texto.substring(inicio, this.posicion);
                tokens.push(new Token(TokenType.NUMERO, numero, inicio));
            }
            else if (char === '+') {
                tokens.push(new Token(TokenType.SUMA, char, this.posicion));
                this.posicion++;
            }
            else if (char === '-') {
                tokens.push(new Token(TokenType.RESTA, char, this.posicion));
                this.posicion++;
            }
            else {
                throw new SyntaxError(`ERROR LÉXICO: Carácter no válido '${char}' en posición ${this.posicion}. Solo se permiten dígitos binarios (0,1), operadores (+,-).`);
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
        return `${indentacion}├─ Numero: ${this.valor} (decimal: ${parseInt(this.valor, 2)})`;
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
        let resultado = `${indentacion}├─ Operacion: ${this.operador}\n`;
        resultado += `${indentacion}│  ├─ Izquierdo:\n`;
        resultado += `${this.izquierdo.mostrarEstructura(nivel + 2)}\n`;
        resultado += `${indentacion}│  └─ Derecho:\n`;
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
            throw new SyntaxError(`ERROR SINTÁCTICO: Token inesperado '${this.tokenActual.valor}' en posición ${this.tokenActual.posicion}. Se esperaba fin de expresión.`);
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
            throw new SyntaxError(`ERROR SINTÁCTICO: Se esperaba un número o '(' pero se encontró fin de expresión.`);
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
            throw new SyntaxError(`ERROR SINTÁCTICO: Operador '${this.tokenActual.valor}' en posición ${this.tokenActual.posicion} sin operando izquierdo. Se esperaba un número o '('.`);
        }
        else {
            throw new SyntaxError(`ERROR SINTÁCTICO: Token inesperado '${this.tokenActual.valor}' en posición ${this.tokenActual.posicion}. Se esperaba un número binario o '('.`);
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
                if (resultado < 0) {
                    throw new RangeError(`ERROR SEMÁNTICO: El resultado de ${izq} - ${der} es negativo (${resultado}). Este analizador solo maneja números binarios positivos.`);
                }
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
            
            if (error.message.includes('ERROR LÉXICO')) {
                longitudError = 1;
            } 
            else if (error.message.includes('Número binario')) {
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
    
    const paddingLeft = parseFloat(inputStyles.paddingLeft) || 0;
    const paddingTop = parseFloat(inputStyles.paddingTop) || 0;
    
    errorOverlay.style.left = (inputRect.left + paddingLeft + anchoAntes -10) + 'px';
    errorOverlay.style.top = (inputRect.bottom -10) + 'px';
    errorOverlay.style.width = Math.max(anchoError, fontSize * 0.8) + 'px';
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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`EXPRESIÓN: ${resultado.expresionOriginal}`);
    console.log(`${'='.repeat(60)}`);

    if (resultado.exito) {
        console.log('✅ ANÁLISIS EXITOSO');
        console.log('\n📝 TOKENS GENERADOS:');
        resultado.tokens.slice(0, -1).forEach((token, index) => {
            console.log(`  ${index + 1}. ${token.tipo}: "${token.valor}" (pos: ${token.posicion})`);
        });

        console.log('\n🌳 ESTRUCTURA JERÁRQUICA (AST):');
        console.log('└─ Expresión Principal');
        const estructuraAST = resultado.ast.mostrarEstructura(1);
        console.log(estructuraAST);

        console.log('\n🎯 RESULTADO:');
        console.log(`  Binario: ${resultado.resultado}`);
        console.log(`  Decimal: ${parseInt(resultado.resultado, 2)}`);

        console.log('\n🔍 VERIFICACIÓN:');
        try {
            const expresionDecimal = resultado.expresionOriginal.replace(/[01]+/g, (match) => {
                return parseInt(match, 2).toString();
            });
            const resultadoDecimal = eval(expresionDecimal);
            console.log(`  ${resultado.expresionOriginal} (binario)`);
            console.log(`  = ${expresionDecimal} (decimal)`);
            console.log(`  = ${resultadoDecimal}`);
            console.log(`  = ${resultadoDecimal.toString(2)} (binario)`);
        } catch (e) {
            console.log('  No se pudo realizar la verificación automática');
        }
    } else {
        console.log('❌ ERROR EN EL ANÁLISIS');

        if (resultado.error) {
            console.log(`\n💥 ${resultado.error}`);

            const match = resultado.error.match(/posición (\d+)/);
            if (match) {
                const posicion = parseInt(match[1]);
                console.log('\n📍 UBICACIÓN DEL ERROR:');
                console.log(`  "${resultado.expresionOriginal}"`);
                console.log(`   ${' '.repeat(posicion)}^`);
                console.log(`   ${' '.repeat(posicion)}Error aquí`);
            }

            console.log('\n💡 SUGERENCIAS:');
            if (resultado.error.includes('Carácter no válido')) {
                console.log('  - Solo use dígitos binarios (0, 1)');
                console.log('  - Operadores permitidos: +, -, (, )');
            } else if (resultado.error.includes('Se esperaba')) {
                console.log('  - Asegúrese de que cada operador tenga operandos');
            } else if (resultado.error.includes('negativo')) {
                console.log('  - Este analizador no maneja números negativos');
                console.log('  - Asegúrese de que el resultado sea positivo');
            }
        } else {
            console.log('\n💥 Error desconocido');
        }
    }
}


const errorCSS = `
@keyframes errorPulse {
    0% { opacity: 0; transform: scaleX(0); }
    50% { opacity: 1; transform: scaleX(1.1); }
    100% { opacity: 1; transform: scaleX(1); }
}

.error-overlay {
    transition: all 0.3s ease;
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = errorCSS;
    document.head.appendChild(style);
}