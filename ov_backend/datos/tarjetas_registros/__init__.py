"""Tarjetas del LLM de registros (esquema v7): fuente única para el runner de `tests/llm` y, desde el lote 2, para la carga.

Una tarjeta es de un ítem (`TARJETAS[codigo]`) o de una opción de ese ítem (`TARJETAS[codigo]['por_opcion'][opcion]`).
`HASHES` guarda el sha256 del texto de cada tarjeta (`codigo` o `codigo#OPCION`): cambiar una tarjeta exige cambiar su hash.
"""

from datos.tarjetas_registros import b1_1
from datos.tarjetas_registros import b1_3
from datos.tarjetas_registros import b1_6
from datos.tarjetas_registros import b1_7
from datos.tarjetas_registros import b2_3
from datos.tarjetas_registros import b2_4
from datos.tarjetas_registros import b3_4
from datos.tarjetas_registros import b4_1
from datos.tarjetas_registros import b4_2
from datos.tarjetas_registros import b4_5
from datos.tarjetas_registros import b5_1
from datos.tarjetas_registros import b5_3

TARJETAS = {**b1_1.TARJETAS, **b1_3.TARJETAS, **b1_6.TARJETAS, **b1_7.TARJETAS, **b2_3.TARJETAS, **b2_4.TARJETAS, **b3_4.TARJETAS, **b4_1.TARJETAS, **b4_2.TARJETAS, **b4_5.TARJETAS, **b5_1.TARJETAS, **b5_3.TARJETAS}

HASHES = {
    'b1-1-gustos': '075639b4579f43577f16edfdcedfc13123c8c299f5cb093bc53073d9aa56603e',
    'b1-1-logro': '95e862a6705b4c0a7bda9991c1dcd7b272baaa8485a3219a95f539cb937fab54',
    'b1-1-logro#NINGUNO': '134cf23a0d8fe7ada97bf15cb4736641f4de8402412c98394a1cafa130e2357c',
    'b1-1-dificultad': '1abb10ab5c4b7c3b20c1a5be1f62d29d1b4de1b054ea9169b2ca8d19ee04ecd8',
    'b1-3-voz': '30498fc7092631f7d252b8cbb7611e059ea915448f226b72ad02cb7893259122',
    'b1-3-mia': '4514b6850eec7f107fe530e1ff794c310742f4dd602b45c777e3328ae5cd2b6e',
    'b1-3-mia#AUN_NO': '2a926b448223cff5dbdb0e811700f779e8c6381919a8cd7b190b1bc81a4a06bb',
    'b1-3-contraste': '3b7b38bc900c855110c51e178d469dd96f7d63cfde8e4893ffd99b9abae1c293',
    'b1-6-mito': 'd5725bce461a8f012156e16ac1d5c4cb54be7e6406e84161b040501496de7377',
    'b1-6-mito#NINGUNO': '0093477ad0b6a8cc0d9315d9f6a4a8d3e0e45e0566cfef30dded1155bd05a954',
    'b1-7-dia': '3d4070082e661e84c8135397ee160b84c16d274d16b7ef3a6bbc3ffadb2974ba',
    'b1-7-dia#CUESTA': '6d828cc2df3561add73b0d3bff73af944e518db75e5d166764b64b8a8bf33079',
    'b1-7-hito': 'fd3c0199d979bd251d26d1d4ad6dcf2f0f1e5437c87c0b744eab2cc477ecb22c',
    'b1-7-freno': 'b71252b70ae17775dc13bebeb59a75655c8680764f4247e7e16122f326c89d85',
    'b2-3-valores': '0971ffa4813449269fbe452e82847dae888730b3220f596a7f7a9588096dcbcc',
    'b2-4-bien': 'db3d6b2885def119aeaacd3590f67eccf1cceae71f57b303098253ba9f571854',
    'b2-4-cruce': 'a630b8af2c7c471734861ecf0b69e7480285cedd579d744a70d24682abcfd203',
    'b3-4-necesito': 'e601f6e04ae0917806df72e44f6abd6d58ad98f30edc17d85f4dd15a99acd3e0',
    'b3-4-quien': '7227bd6e494fb9c66a18f2d208f2858d1657a48e3db6fd9fa6a517b9c9b58679',
    'b3-4-quien#NADIE': '09a1b449aba29d9d26d7e8426f7fc21c0d56ce02570528ef3d79013fdf26ab49',
    'b4-1-respalda': '9c7c34b138cc4547c638c1e8bc04db438b44e26b3169157f022c61ea7c9fd33f',
    'b4-1-menos': '845ccfe471be3eb0d5935501f53069e3b27aadda257b7d28e60275f605b5a4a6',
    'b4-1-menos#TODO': '1a0ee15f807d5d6b2c8cec4b9ce6cbbabcedf718421b383e70eb76bb71d2deae',
    'b4-2-estilo': '69143dbe80f566dfac3e9be1a1b521c07fec6361282900c59b85ba58af6acaf7',
    'b4-5-moneda': 'b588d3f1bddd9de4ed2bf0a35a9efd3a498e3958381e92c57bff8472af398f56',
    'b5-1-seguridad': 'ba25bce7a3fc7c72d06ed76ec3435f883152add9422c7764a05c31fbe16355fc',
    'b5-3-cambio': 'de6da582de3fd83462bb904583aaa0180f636479d8063a5751318d8ca6e3cbe1',
    'b5-3-cambio#IGUAL': '5230dee8faafc167f48f3b5019cfd433c2b55e1d9208120660d2589e85e2d243',
}
