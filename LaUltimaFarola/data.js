/* La última farola — niveles, historia y textos */
(function () {
  const LF = (window.LF = window.LF || {});
  LF.T = 16;

  function Builder(w, h) {
    this.w = w; this.h = h; this.g = [];
    for (let y = 0; y < h; y++) this.g.push(new Array(w).fill(' '));
    this.triggers = []; this.alba = [];
  }
  Builder.prototype.rect = function (x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (y >= 0 && y < this.h && x >= 0 && x < this.w) this.g[y][x] = c;
    return this;
  };
  Builder.prototype.put = function (x, y, c) { if (y >= 0 && y < this.h && x >= 0 && x < this.w) this.g[y][x] = c; return this; };
  Builder.prototype.trig = function (o) { this.triggers.push(o); return this; };
  LF.Builder = Builder;

  /* ---------- Leyenda ----------
   #  piedra sólida          =  tabla (se atraviesa desde abajo)
   m  tabla-recuerdo: existe con cualquier luz
   M  recuerdo profundo: solo existe con la luz de una farola
   x  espinas de niebla      w  agua           d  sombra (se cruza con impulso)
   P  inicio   L farola   o aceite   p postal   R recuerdo (habilidad)
   W  niebla suelta horizontal   V niebla suelta vertical
   G  salida del nivel   B el gran farol del faro
  */

  const levels = [];

  /* ===================== PRÓLOGO · EL PUERTO ===================== */
  levels.push({
    key: 'puerto', num: 'Prólogo', name: 'El puerto', pal: 0, music: 'puerto', amb: 'olas',
    build() {
      const b = new Builder(150, 17);
      b.rect(0, 0, 0, 16, '#'); b.rect(149, 0, 149, 16, '#');
      b.rect(0, 14, 35, 16, '#');
      b.put(3, 13, 'P');
      b.rect(26, 13, 27, 13, '#'); b.rect(30, 12, 31, 13, '#');
      b.put(16, 13, 'L');
      b.rect(36, 15, 37, 16, 'w');
      b.rect(38, 14, 52, 16, '#');
      b.put(45, 13, 'L'); b.put(49, 11, 'o');
      b.rect(53, 15, 72, 16, 'w');
      b.rect(53, 13, 56, 13, '='); b.rect(59, 12, 62, 12, '='); b.rect(65, 13, 68, 13, '='); b.rect(70, 12, 72, 12, '=');
      b.rect(60, 10, 61, 10, '='); b.put(60, 9, 'p');
      b.rect(73, 14, 90, 16, '#'); b.put(75, 13, 'L');
      b.rect(91, 15, 108, 16, 'w');
      b.rect(91, 13, 93, 13, 'm'); b.rect(96, 13, 98, 13, 'm'); b.rect(101, 13, 103, 13, 'm'); b.rect(106, 13, 108, 13, 'm');
      b.put(97, 11, 'o');
      b.rect(109, 14, 148, 16, '#');
      b.rect(111, 12, 113, 12, '='); b.rect(116, 10, 118, 10, '='); b.put(117, 9, 'p');
      b.put(128, 13, 'L');
      b.put(141, 13, 'G');
      b.alba = [[8, 13], [21, 13], [34, 13], [48, 13], [77, 13], [112, 13], [137, 13]];
      b.trig({ x: 4, id: 'inicio' }).trig({ x: 12, id: 'farola' }).trig({ x: 23, id: 'saltar' })
       .trig({ x: 47, id: 'aceite' }).trig({ x: 86, id: 'recuerdos' }).trig({ x: 124, id: 'casi' });
      return b;
    },
    dialogs: {
      inicio: [
        { say: 'alba', t: 'Vamos, Lía. La noche no espera, y el puerto le tiene miedo a la oscuridad.' },
        { say: 'lia', t: '¡Voy, abuela!' },
        { hint: 'move' }
      ],
      farola: [
        { say: 'alba', t: 'Acercá tu farol a la farola. Así, despacito. Cada farola encendida es un lugar donde volver.' },
        { hint: 'lamp' }
      ],
      saltar: [{ hint: 'jump' }],
      aceite: [
        { say: 'alba', t: 'Juntá las gotas de aceite. Mirá tu bufanda: cuando brilla poco, el farol tiene hambre.' }
      ],
      recuerdos: [
        { say: 'alba', t: '¿Ves esas tablas color sepia? Mi madre decía que la luz guarda los recuerdos del puerto.' },
        { say: 'lia', t: '¿Y si se apaga la luz?' },
        { say: 'alba', t: 'Por eso las encendemos, mi vida. Para no olvidar.' }
      ],
      casi: [{ say: 'alba', t: 'La última de la calle. Después, a casa, que hace frío.' }],
      fin: 'blackout'
    }
  });

  /* ===================== ACTO 2 · LOS TEJADOS ===================== */
  levels.push({
    key: 'tejados', num: 'Acto 2', name: 'Los tejados', pal: 1, music: 'tejados', amb: 'viento',
    build() {
      const b = new Builder(152, 20);
      b.rect(0, 0, 0, 19, '#'); b.rect(151, 0, 151, 19, '#');
      // techo A
      b.rect(0, 14, 14, 19, '#'); b.put(2, 13, 'P');
      b.put(6, 13, 'R');
      b.rect(9, 12, 10, 13, '#');
      // farola en poste + puente de recuerdos profundos
      b.rect(20, 14, 20, 19, '#'); b.put(20, 13, 'L');
      b.rect(15, 14, 19, 14, 'M'); b.rect(21, 14, 24, 14, 'M');
      // red de seguridad: techo bajo
      b.rect(15, 18, 24, 19, '#'); b.rect(23, 17, 24, 17, '#'); b.put(17, 17, 'p');
      // techo B
      b.rect(25, 15, 42, 19, '#'); b.put(30, 14, 'L');
      // edificio alto con farola arriba
      b.rect(46, 9, 62, 19, '#'); b.put(48, 8, 'L');
      b.rect(43, 13, 44, 13, 'M'); b.rect(44, 11, 45, 11, 'M');
      // tendederos con niebla suelta
      b.rect(64, 9, 66, 9, '='); b.rect(69, 9, 71, 9, '=');
      b.put(67, 7, 'W'); b.put(70, 7, 'o');
      // techo C
      b.rect(73, 11, 90, 19, '#'); b.put(76, 10, 'L');
      b.rect(84, 9, 85, 10, '#'); b.put(84, 7, 'p');
      b.put(80, 8, 'V');
      // gran salto con farola en poste
      b.rect(98, 12, 98, 19, '#'); b.put(98, 11, 'L');
      b.rect(91, 12, 97, 12, 'M'); b.rect(99, 12, 104, 12, 'M');
      b.put(95, 10, 'W'); b.put(101, 10, 'W'); b.put(98, 8, 'p');
      // techo D
      b.rect(105, 12, 125, 19, '#'); b.put(108, 11, 'L'); b.put(112, 10, 'o');
      b.put(118, 10, 'W');
      // balcón y edificio E
      b.rect(130, 9, 133, 9, '#'); b.put(131, 8, 'L');
      b.rect(126, 11, 127, 11, 'M'); b.rect(128, 10, 129, 10, 'M');
      b.rect(132, 7, 133, 7, 'M');
      b.rect(134, 6, 150, 19, '#');
      b.put(146, 5, 'G');
      b.trig({ x: 4, id: 'inicio' }).trig({ x: 12, id: 'profundo' }).trig({ x: 58, id: 'niebla' }).trig({ x: 106, id: 'mitad' });
      return b;
    },
    dialogs: {
      inicio: [
        { say: 'pez', t: 'Desde arriba se ven las farolas apagadas. Cada una es algo que tu abuela está olvidando.' },
        { say: 'lia', t: 'Entonces vamos a encenderlas todas.' }
      ],
      R: [
        { memory: 'El primer farol', t: 'Alba tenía tu edad. Su padre le puso el farol en las manos y le dijo: «La luz no se guarda, se comparte. Tirala lejos».' },
        { ability: 'spark' },
        { hint: 'spark' }
      ],
      profundo: [
        { say: 'pez', t: 'Esas tablas de allá están muy hundidas en el olvido. Solo la luz de una farola puede traerlas de vuelta.' },
        { say: 'pez', t: 'Tirale una chispa a la farola del poste.' }
      ],
      niebla: [
        { say: 'pez', t: 'Cuidado: niebla suelta. Una chispa la deshace. Y tu luz la vuelve lenta.' },
        { hint: 'aim' }
      ],
      mitad: [{ say: 'lia', t: 'Nunca había visto la ciudad desde tan alto. Parece un mapa de lucecitas.' }],
      fin: [
        { say: 'lia', t: 'La abuela aprendió el oficio a mi edad... Nunca me lo había contado.' },
        { say: 'pez', t: 'Hay cosas que solo se cuentan cuando se están por perder. Sigamos: el mercado.' }
      ]
    }
  });

  /* ===================== ACTO 3 · EL MERCADO INUNDADO ===================== */
  levels.push({
    key: 'mercado', num: 'Acto 3', name: 'El mercado inundado', pal: 2, music: 'mercado', amb: 'agua',
    build() {
      const b = new Builder(178, 22);
      b.rect(0, 0, 0, 21, '#'); b.rect(177, 0, 177, 21, '#');
      b.rect(1, 15, 176, 20, 'w'); b.rect(0, 21, 177, 21, '#');
      // muelle de entrada (agua todavía peligrosa)
      b.rect(0, 12, 10, 20, '#'); b.put(2, 11, 'P'); b.put(7, 11, 'L');
      b.rect(13, 13, 15, 20, '#'); b.rect(18, 12, 20, 20, '#');
      b.rect(23, 12, 32, 20, '#'); b.put(27, 11, 'R');
      // gran puesto: hay que bucear por debajo
      b.rect(36, 8, 44, 16, '#'); b.put(40, 20, 'p'); b.put(42, 19, 'o');
      b.rect(37, 6, 43, 7, '#');
      b.rect(48, 13, 50, 20, '#'); b.put(49, 12, 'L');
      b.put(55, 18, 'V');
      // toldos con niebla
      b.rect(53, 12, 56, 12, '='); b.rect(59, 11, 62, 11, '='); b.rect(65, 12, 67, 12, '=');
      b.put(60, 9, 'W'); b.rect(60, 8, 61, 8, '='); b.put(61, 7, 'o');
      // muro: bucear entre espinas
      b.rect(70, 6, 74, 16, '#'); b.rect(69, 20, 75, 20, 'x');
      // dársena
      b.rect(78, 12, 100, 20, '#'); b.put(80, 11, 'L');
      b.rect(88, 9, 90, 9, '='); b.rect(92, 7, 93, 7, '='); b.put(92, 6, 'p');
      // pileta profunda con cueva
      b.rect(103, 12, 105, 12, 'm'); b.rect(108, 11, 110, 11, 'm'); b.rect(113, 12, 115, 12, 'm');
      b.put(109, 9, 'W');
      b.rect(120, 13, 120, 20, '#'); b.put(120, 12, 'L');
      b.rect(121, 12, 127, 12, 'M');
      b.rect(117, 17, 119, 17, '#'); b.put(118, 19, 'V'); b.put(113, 20, 'o');
      b.rect(124, 16, 132, 16, '#'); b.rect(124, 17, 124, 19, '#'); b.put(128, 19, 'p'); b.put(130, 18, 'o');
      b.put(135, 18, 'V');
      // salida escalonada
      b.rect(128, 11, 129, 11, '='); b.rect(133, 12, 135, 12, '=');
      b.rect(141, 12, 150, 20, '#'); b.put(143, 11, 'L');
      b.rect(152, 10, 155, 20, '#'); b.rect(158, 8, 176, 20, '#');
      b.put(147, 9, 'W');
      b.put(170, 7, 'G');
      b.trig({ x: 4, id: 'inicio' }).trig({ x: 34, id: 'bucear' }).trig({ x: 82, id: 'abajo' }).trig({ x: 138, id: 'salida' });
      return b;
    },
    dialogs: {
      inicio: [
        { say: 'pez', t: 'El mercado se inundó hace muchos años. Si te caés al agua, el farol se apaga... por ahora.' }
      ],
      R: [
        { memory: 'La gran inundación', t: 'El agua subió de golpe y tu abuelo Raúl quedó atrapado en el puesto de pescado. Alba se tiró al agua con el farol encendido. El farol no se apagó. Nunca supo por qué.' },
        { say: 'pez', t: 'Yo sí sé por qué.' },
        { ability: 'water' },
        { hint: 'swim' }
      ],
      bucear: [{ say: 'pez', t: 'Ese puesto tapa el paso. Por abajo del agua se puede.' }],
      abajo: [
        { say: 'pez', t: 'Abajo del agua también hay recuerdos. Y algunas cosas que conviene esquivar.' }
      ],
      salida: [{ say: 'lia', t: 'La abuela le tiene miedo al agua. Y aun así se tiró.' }],
      fin: [
        { say: 'lia', t: 'Salvó al abuelo... y nunca dejó de encender farolas, aunque el agua la asustara.' },
        { say: 'pez', t: 'El coraje no es no tener miedo. Es llevar la luz igual. Vamos a la torre del reloj.' }
      ]
    }
  });

  /* ===================== ACTO 4 · LA TORRE DEL RELOJ ===================== */
  levels.push({
    key: 'torre', num: 'Acto 4', name: 'La torre del reloj', pal: 3, music: 'torre', amb: 'reloj', vertical: true,
    chase: { start: 80, stop: 12, speed: 17 },
    build() {
      const W = 30, H = 112;
      const b = new Builder(W, H);
      b.rect(0, 0, 1, H - 1, '#'); b.rect(W - 2, 0, W - 1, H - 1, '#');
      b.rect(0, 106, W - 1, H - 1, '#');
      b.rect(0, 0, W - 1, 4, '#');
      const floor = (y, h0, h1) => { b.rect(2, y, W - 3, y, '#'); b.rect(h0, y, h1, y, ' '); };
      // S1 (106→94): recuerdo + muro de sombra
      b.put(24, 105, 'P'); b.put(19, 105, 'R');
      b.rect(13, 95, 13, 105, 'd');
      b.rect(3, 104, 6, 104, '='); b.rect(7, 102, 10, 102, '='); b.rect(3, 100, 6, 100, '=');
      b.rect(7, 98, 10, 98, '='); b.rect(3, 96, 6, 96, '=');
      b.put(26, 103, 'o');
      floor(94, 3, 6);
      // S2 (94→82)
      b.put(9, 93, 'L');
      b.rect(12, 92, 15, 92, '='); b.rect(17, 90, 20, 90, '='); b.rect(22, 88, 25, 88, '=');
      b.rect(17, 86, 20, 86, '='); b.rect(12, 84, 15, 84, '=');
      b.put(18, 88, 'W'); b.put(24, 86, 'o'); b.put(26, 90, 'p');
      floor(82, 12, 15);
      // S3 (82→70): empieza la persecución
      b.put(18, 81, 'L');
      b.rect(19, 80, 22, 80, '='); b.rect(24, 78, 26, 78, '='); b.rect(19, 76, 22, 76, '=');
      b.rect(16, 71, 16, 77, 'd');
      b.rect(9, 76, 13, 76, '='); b.rect(4, 74, 7, 74, '='); b.rect(9, 72, 12, 72, '=');
      floor(70, 9, 12);
      // S4 (70→58)
      b.put(15, 69, 'L');
      b.rect(16, 68, 19, 68, '='); b.rect(21, 66, 24, 66, '='); b.rect(16, 64, 19, 64, '=');
      b.rect(11, 62, 14, 62, '='); b.rect(6, 60, 9, 60, '=');
      b.rect(22, 69, 26, 69, 'x'); b.put(20, 62, 'V'); b.put(25, 63, 'p');
      floor(58, 6, 9);
      // S5 (58→46): doble sombra
      b.put(4, 57, 'L');
      b.rect(11, 56, 14, 56, '='); b.rect(17, 47, 17, 55, 'd');
      b.rect(19, 54, 23, 54, '='); b.rect(24, 52, 26, 52, '='); b.rect(19, 50, 22, 50, '=');
      b.rect(12, 48, 15, 48, '='); b.put(24, 49, 'o');
      floor(46, 12, 15);
      // S6 (46→34)
      b.put(18, 45, 'L');
      b.rect(19, 44, 22, 44, '='); b.rect(24, 42, 26, 42, '='); b.rect(19, 40, 22, 40, '=');
      b.rect(14, 38, 17, 38, '='); b.rect(9, 36, 12, 36, '=');
      b.put(20, 41, 'W'); b.put(13, 36, 'W'); b.put(25, 40, 'o'); b.put(3, 38, 'p');
      b.rect(2, 39, 5, 39, '=');
      floor(34, 9, 12);
      // S7 (34→22)
      b.put(15, 33, 'L');
      b.rect(4, 32, 7, 32, '='); b.rect(8, 30, 11, 30, '='); b.rect(14, 23, 14, 31, 'd');
      b.rect(16, 28, 19, 28, '='); b.rect(21, 26, 24, 26, '='); b.rect(16, 24, 19, 24, '=');
      b.put(22, 30, 'V');
      floor(22, 16, 19);
      // S8 (22→10): la cima
      b.put(21, 21, 'L');
      b.rect(22, 20, 25, 20, '='); b.rect(17, 18, 20, 18, '='); b.rect(12, 16, 15, 16, '=');
      b.rect(7, 14, 10, 14, '='); b.rect(12, 12, 15, 12, '=');
      b.put(9, 17, 'W');
      floor(10, 12, 15);
      b.put(22, 9, 'G');
      b.trig({ y: 103, id: 'inicio' }).trig({ y: 80, id: 'persecucion' }).trig({ y: 52, id: 'voz' }).trig({ y: 28, id: 'voz2' });
      return b;
    },
    dialogs: {
      inicio: [{ say: 'pez', t: 'La niebla es más espesa acá. Es donde ella guarda lo que más le duele.' }],
      R: [
        { memory: 'El miedo', t: 'Alba, de noche, mirándote dormir. Le habla bajito al farol: «Tengo miedo de que un día no me acuerde de su nombre».' },
        { say: 'lia', t: '...' },
        { ability: 'dash' },
        { hint: 'dash' }
      ],
      persecucion: [
        { bark: 'niebla', t: 'Lía... quedate conmigo en la niebla. Acá no hace falta recordar nada.', d: 4 },
        { bark: 'lia', t: '¡No! ¡Vos no sos ella!', d: 2.6 },
        { bark: 'pez', t: '¡Subí! ¡Rápido!', d: 2.4 }
      ],
      voz: [{ bark: 'niebla', t: 'Si me olvidás, no duele...', d: 3 }],
      voz2: [{ bark: 'niebla', t: '¿Cómo era tu nombre, mi vida...?', d: 3.4 }],
      fin: [
        { say: 'lia', t: 'Era su voz... La niebla es su miedo, ¿no?' },
        { say: 'pez', t: 'Miedo a olvidarte. Por eso te busca. Vamos al faro: es la última luz.' }
      ]
    }
  });

  /* ===================== ACTO 5 · EL FARO ===================== */
  levels.push({
    key: 'faro', num: 'Acto 5', name: 'El faro', pal: 4, music: 'faro', amb: 'olas',
    build() {
      const b = new Builder(190, 24);
      b.rect(0, 0, 0, 23, '#'); b.rect(189, 0, 189, 23, '#');
      b.rect(1, 16, 188, 22, 'w'); b.rect(0, 23, 189, 23, '#');
      b.rect(0, 14, 12, 22, '#'); b.put(2, 13, 'P');
      b.rect(15, 13, 18, 22, '#'); b.rect(21, 14, 24, 22, '#');
      b.rect(27, 12, 30, 22, '#'); b.put(28, 11, 'L');
      b.rect(32, 12, 34, 12, 'm'); b.rect(37, 12, 39, 12, 'm'); b.put(35, 10, 'W');
      b.rect(41, 12, 50, 22, '#'); b.rect(46, 6, 46, 11, 'd');
      b.rect(51, 13, 60, 22, '#'); b.put(55, 12, 'L');
      // algas de niebla: el puente es obligatorio
      b.rect(61, 16, 75, 16, 'x');
      b.rect(68, 14, 68, 22, '#'); b.put(68, 13, 'L');
      b.rect(61, 14, 67, 14, 'M'); b.rect(69, 14, 75, 14, 'M');
      b.put(65, 12, 'W'); b.put(72, 11, 'p');
      b.rect(76, 13, 95, 22, '#'); b.put(78, 12, 'L');
      b.put(85, 10, 'V'); b.put(90, 11, 'W'); b.put(88, 11, 'o');
      b.rect(97, 12, 99, 12, 'm'); b.rect(103, 11, 105, 11, 'm');
      b.rect(108, 14, 109, 22, '#'); b.rect(108, 7, 109, 13, 'd');
      b.rect(111, 12, 113, 12, 'm');
      b.rect(114, 13, 135, 22, '#'); b.put(116, 12, 'L');
      b.rect(126, 11, 127, 12, '#'); b.rect(129, 9, 131, 12, '#'); b.put(130, 8, 'p'); b.put(122, 11, 'o');
      b.rect(136, 13, 168, 22, '#');
      b.rect(145, 12, 146, 12, 'x'); b.rect(152, 12, 154, 12, 'x'); b.put(158, 10, 'W'); b.put(162, 12, 'L');
      // el faro
      b.rect(169, 1, 169, 9, '#'); b.rect(186, 1, 186, 22, '#'); b.rect(169, 0, 186, 0, '#');
      b.rect(170, 1, 185, 12, 'b'); b.rect(170, 13, 185, 22, '#'); b.put(172, 12, 'L');
      b.rect(173, 11, 177, 11, '='); b.rect(180, 9, 184, 9, '='); b.rect(173, 7, 177, 7, '=');
      b.rect(180, 5, 184, 5, '='); b.rect(170, 3, 185, 3, '=');
      b.put(178, 6, 'W');
      b.put(177, 2, 'B');
      b.trig({ x: 4, id: 'inicio' }).trig({ x: 58, id: 'algas' }).trig({ x: 140, id: 'cancion' }).trig({ x: 171, id: 'adentro' });
      return b;
    },
    dialogs: {
      inicio: [
        { say: 'pez', t: 'El faro guiaba los barcos de tu abuelo. Si lo encendés, toda la ciudad lo va a ver.' }
      ],
      algas: [{ say: 'pez', t: 'Algas de niebla en el agua. Mejor por arriba: buscá la farola del poste.' }],
      cancion: [
        { call: 'song' },
        { say: 'narr', t: 'Desde el faro llega una canción. La que Alba te cantaba para dormir.' }
      ],
      adentro: [{ say: 'lia', t: 'Abuela... ya llego.' }],
      fin: 'ending'
    }
  });

  /* ===================== EPÍLOGO ===================== */
  LF.epilogue = {
    key: 'epilogo', num: '', name: 'Epílogo', pal: 5, music: 'final', amb: 'olas',
    build() {
      const b = new Builder(84, 17);
      b.rect(0, 0, 0, 16, '#'); b.rect(83, 0, 83, 16, '#');
      b.rect(0, 14, 83, 16, '#'); b.put(3, 13, 'P');
      for (let x = 12; x < 78; x += 9) b.put(x, 13, 'L');
      return b;
    },
    dialogs: {}
  };

  LF.levels = levels;

  LF.speakers = {
    alba: { name: 'Alba', color: '#e9c98f' },
    lia: { name: 'Lía', color: '#f5c542' },
    pez: { name: 'Pez Lámpara', color: '#7fe0d0' },
    niebla: { name: 'La Niebla', color: '#c7cbe0' },
    narr: { name: '', color: '#cfc3a8' }
  };

  LF.postcards = [
    { id: 'puerto-0', act: 0, title: 'Puerto, 1961', t: 'Alba con trenzas, sentada en una bitácora del muelle, mirando entrar los barcos.' },
    { id: 'puerto-1', act: 0, title: 'La primera farola', t: 'La primera farola que encendió sola. Se quemó un dedo y no lloró.' },
    { id: 'tejados-0', act: 1, title: 'Entre la ropa tendida', t: 'Alba y su hermano Tito contando estrellas en la azotea, entre sábanas que olían a jabón.' },
    { id: 'tejados-1', act: 1, title: 'Una carta', t: '«Querida Alba: el mar es enorme sin vos. Vuelvo en marzo. — Raúl»' },
    { id: 'tejados-2', act: 1, title: 'El baile del club', t: 'Una foto del baile del club del puerto. Alba de vestido claro, riéndose de algo que nadie recuerda.' },
    { id: 'mercado-0', act: 2, title: 'La bufanda', t: 'Mercado, 1975. Raúl le regala a Alba una bufanda amarilla «para que te encuentre en la niebla».' },
    { id: 'mercado-1', act: 2, title: 'El día después', t: 'El día después de la inundación: todo el barrio sacando sillas al sol para secarlas.' },
    { id: 'mercado-2', act: 2, title: 'Receta', t: 'Buñuelos de algas, con la letra de Alba. Al pie: «A Lía le gustan con mucho azúcar».' },
    { id: 'torre-0', act: 3, title: 'Tu mamá', t: '1990. Alba con una bebé en brazos al pie de la torre: tu mamá.' },
    { id: 'torre-1', act: 3, title: 'Las horas', t: '«Acá le enseñé a tu mamá a leer la hora. Las agujas grandes eran las que mandaban.»' },
    { id: 'torre-2', act: 3, title: 'Desde arriba', t: 'Una postal sin escribir, con la ciudad vista desde el reloj. Alba la guardó durante treinta años.' },
    { id: 'faro-0', act: 4, title: 'Vos', t: '2014. Alba con vos recién nacida, y el farol prendido en la ventana.' },
    { id: 'faro-1', act: 4, title: 'Un dibujo', t: 'Un dibujo tuyo: dos personas y una farola. Detrás, con letra de nena: «Para la abuela».' }
  ];

  LF.abilityText = {
    spark: { name: 'Chispa', d: 'Lanzá una chispa para encender farolas lejanas y deshacer la niebla suelta.' },
    water: { name: 'Farol de agua', d: 'El farol ya no se apaga bajo el agua. Podés nadar.' },
    dash: { name: 'Atravesar la oscuridad', d: 'Un impulso que cruza las sombras y te protege un instante.' }
  };
})();
