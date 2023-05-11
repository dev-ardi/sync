# Sync-lib

Esta es una libreria que permite la sincronización entre dispositivos que ejecutan electron o node.js.

Esto está destinado a ser utilizado en un escenario de múltiples procesos (o múltiples dispositivos). Esto utiliza una relación maestro-esclavo, donde el maestro emite eventos sincronizados a todos los esclavos.

**Esta biblioteca permite la sincronización de:**

- Eventos
- HTML5 Media (Audio y Video)

Expone dos funciones y el constructor:

```ts
scheduleEvent(evento: string, tiempoDeEspera: milisegundos, ...args: string[])
scheduleMedia(src: string, programar: milisegundos, buscar: segundos = 0)
new SyncObject(eventos?: CallbackCollection, descubrir?: Discover)
```
Y tres eventos:

```ts
onPromotion: (...args: any) => any // Se ejecuta cuando el proceso es elegido como maestro
onDemotion: (...args: any) => any // Se ejecuta cuando el proceso es degradado de maestro a esclavo
onNewMaster: (...args: any) => any // Se ejecuta cuando se ha encontrado un nuevo maestro
```

## Cómo usar
### Crear el objeto de sincronización:
Se le pasa un diccionario de callbacks (opcional):
```ts
{
    selectVideo: argSrc => document.getElementById('vidElement1').src = argSrc,
    cambioSlide: argSlide => engine.changeSlide(argSlide)
}
```

Y una opcionalmente una instancia de `node-discover`.

### Usar el objeto
Toda la lógica debe estar en los callbacks proporcionados por la biblioteca:

`onPromotion`: Esto sucede en el proceso que es elegido como maestro. Toda la lógica de sincronización debe ocurrir aquí. Ejemplo:

```ts
sync.onPromotion = ()=>{
    scheduleEvent('selectVideo', 1000, 'videos/vid1.webm')
    scheduleMedia('23424_mi_video.mp4', 1000)
    }
```

`onNewMaster`: Esto sucede en todos los procesos esclavos. Toda la lógica del cliente debe ocurrir aquí.

`onDemotion`: Esto puede suceder si se encuentra un maestro con un peso más alto que este. Toda la lógica de destrucción podría ocurrir aquí, pero es poco probable que se llame. Hay que tener en cuenta que la instancia subyacente de `node-discover` no se eliminará, su socket seguirá abriendo y escuchando, así como enviando mensajes `hello`.

`scheduleEvent` Sincronizar eventos por nombre de callback.

Ejemplo:
```ts
scheduleEvent('cambioSlide`, 35000, '216562');
```

`scheduleMedia` Sincronizar medios por src con un *seek time* opcional.