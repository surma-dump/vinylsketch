(function () {
  const defaultConfig = {
    backgroundColor: 'white',
    lineColor: 'black',
    turns: 64,
    gapFactor: 0.4,
    segmentsPerTurn: 7200,
    blackFactor: 2,
    startAngle: 360,
    gamma: 1
  };

  class VinylSketch {
    constructor(canvas, image = null) {
      Object.assign(this, defaultConfig, {canvas, image});
    }

    get length() {
      return Math.min(this.canvas.width, this.canvas.height);
    }
    get gap() {
      return this.length/2/this.turns;
    }
    set gap(value) {
      this.turns = this.length/2/value;
    }
    get anglePerSegment() {
      return 360/this.segmentsPerTurn;
    }
    get radiusPerSegment() {
      return this.gap / this.segmentsPerTurn;
    }
    
    toFrequency(b, p) {
      return this.blackFactor * p.radius;
    }
    toAmplitude(b, p) {
      return Math.pow(1-b, this.gamma) * this.gap * this.gapFactor;
    }
    brightnessInImage(ctx, p) {
      const pixel = ctx.getImageData(p.x, p.y, 1, 1).data;
      return (pixel[0]+pixel[1]+pixel[2])/3/255;
    }

    angleToPolar(alpha) {
      return {
        radius: alpha / 360 * this.segmentsPerTurn * this.radiusPerSegment,
        angle: (alpha % 360)/ 360 * 2 * Math.PI
      };
    }

    polarToCartesian(polar) {
      return {
        x: this.length/2 + Math.cos(polar.angle)*polar.radius,
        y: this.length/2 + Math.sin(polar.angle)*polar.radius
      };
    }

    draw() {
      const ctx = this.canvas.getContext('2d');
      const srcCtx = this.image.getContext('2d');
      ctx.fillStyle = this.backgroundColor;
      ctx.strokeStyle = this.lineColor;
      ctx.fillRect(0, 0, this.length, this.length);
      ctx.beginPath();
      ctx.moveTo(this.length/2, this.length/2);
      
      for(let angle = this.startAngle; angle < (this.turns * 360); angle += this.anglePerSegment) {
        let polar = this.angleToPolar(angle);
        let cartesian = this.polarToCartesian(polar);

        const brightness = this.brightnessInImage(srcCtx, cartesian);
        polar.radius += Math.sin(polar.angle * this.toFrequency(brightness, polar)) * this.toAmplitude(brightness, polar);
        cartesian = this.polarToCartesian(polar);
        ctx.lineTo(cartesian.x, cartesian.y);
      }

      ctx.stroke();
    }
  }

  function readFile(file) {
    return new Promise(resolve => {
      const fr = new FileReader();
      fr.addEventListener('load', function () {
        resolve(this.result);
      });
      fr.readAsDataURL(file);
    });
  }

  function toCanvas(dataurl) {
    return new Promise(resolve => {
      const img = new Image();
      img.src = dataurl;
      
      const c = document.createElement('canvas');
      c.width = vs.length;
      c.height = vs.length;
      c.getContext('2d').drawImage(img, 0, 0, img.width, img.height, 0, 0, vs.length, vs.length);
      resolve(c);
    });
  }

  function init() {
    const vs = new VinylSketch(document.querySelector('.vinylsketch'));
    window.vs = vs;
    document.querySelector('input[type=file]').addEventListener('change', evt => {
      const file = evt.target.files[0];
      readFile(file)
        .then(dataurl => {
          vs.dataurl = dataurl;
          return toCanvas(dataurl);
        })
        .then(canvas => {
          vs.image = canvas;
          console.time('draw');
          vs.draw();
          console.timeEnd('draw');
      });
    });

    function genericChangeHandler(event) {
      const value = event.target.value;
      event.target.parentNode.querySelector('.value').textContent = value;
      vs[event.target.dataset.bind] = parseFloat(value);
      vs.draw();
    }

    function genericInputHandler(event) {
      const value = event.target.value;
      event.target.parentNode.querySelector('.value').textContent = value;
    }

    Array.from(document.querySelectorAll('.controls input'))
      .forEach(control => {
        control.addEventListener('input', genericInputHandler);
      });

    Array.from(document.querySelectorAll('.controls input:not(.noauto)'))
      .forEach(control => {
        control.value = vs[control.dataset.bind];
        control.parentNode.querySelector('.value').textContent = control.value;
        control.addEventListener('change', genericChangeHandler);
      });

    [
      function length(event) {
        vs.image.width = vs.image.height = vs.canvas.width = vs.canvas.height = event.target.value;
        toCanvas(vs.dataurl)
          .then(canvas => {
            vs.image = canvas;
            vs.draw();
          });
      }
    ].forEach(f => {
      document.querySelector(`.controls input[data-bind=${f.name}]`)
        .addEventListener('change', event => {
          event.target.parentNode.querySelector('.value').textContent = event.target.value;
          f(event);
        });
    });

    document.querySelector('button.download').addEventListener('click', _ => {
      vs.canvas.toBlob(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'vinylsketch.png';
        link.click();
        window.URL.revokeObjectURL(link.href);
      }, 'image/png');
    });
  }

  init();
})();