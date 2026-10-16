"""Сервер кооператива (docs/COOP.md): раздаёт файлы игры и пересылает сообщения между хостом и клиентами.

Запуск на ПК хоста:  python tools/coop_server.py [порт, по умолчанию 8090]
Друзья в той же сети открывают http://<IP хоста>:<порт>/ — им ничего ставить не надо.

Файлы отдаются без кэша: после правок достаточно обновить страницу.
Сеть (этап 2): /ws — WebSocket. Первый, кто пришёл с role=host, — хост; остальные — клиенты.
Клиент → хост: сообщение с пометкой from=<id клиента>. Хост → клиент: по полю to (или всем, если его нет).
"""
import asyncio
import json
import os
import socket
import sys

from aiohttp import web, WSMsgType

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090

host_ws = None
clients = {}          # id -> ws
next_id = 1


@web.middleware
async def no_cache(request, handler):
    resp = await handler(request)
    resp.headers['Cache-Control'] = 'no-store'
    return resp


async def index(request):
    return web.FileResponse(os.path.join(ROOT, 'index.html'))


# Игра спрашивает, есть ли рядом сервер коопа (на GitHub Pages его нет — там предложит скачать)
async def ping(request):
    return web.Response(text='vasiliy-coop')


async def send(ws, data):
    if ws is not None and not ws.closed:
        try:
            await ws.send_str(data)
        except ConnectionError:
            pass


async def ws_handler(request):
    global host_ws, next_id
    ws = web.WebSocketResponse(heartbeat=10, max_msg_size=16 * 1024 * 1024)
    await ws.prepare(request)
    role = request.query.get('role', 'client')
    if role == 'host':
        if host_ws is not None and not host_ws.closed:
            await ws.send_str(json.dumps({'t': 'error', 'msg': 'host_exists'}))
            await ws.close()
            return ws
        host_ws = ws
        my_id = 0
        print('[coop] хост подключился')
    else:
        my_id = next_id
        next_id += 1
        clients[my_id] = ws
        print(f'[coop] клиент {my_id} подключился')
        await send(host_ws, json.dumps({'t': 'join', 'from': my_id, 'name': request.query.get('name', '')}))
    await ws.send_str(json.dumps({'t': 'hello', 'id': my_id, 'host': host_ws is not None and not host_ws.closed}))
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            if my_id == 0:
                # Хост → клиентам: to — кому, без него — всем. Пересылаем как есть, не разбирая всё сообщение
                head = msg.data[:40]
                to = None
                if head.startswith('{"to":'):
                    to = int(head[6:head.index(',')])
                if to is None:
                    await asyncio.gather(*(send(c, msg.data) for c in list(clients.values())))
                else:
                    await send(clients.get(to), msg.data)
            else:
                # Клиент → хосту: от кого — в начало
                await send(host_ws, '{"from":%d,%s' % (my_id, msg.data[1:]))
    finally:
        if my_id == 0:
            host_ws = None
            print('[coop] хост ушёл')
            await asyncio.gather(*(send(c, json.dumps({'t': 'host_left'})) for c in list(clients.values())))
        else:
            clients.pop(my_id, None)
            print(f'[coop] клиент {my_id} ушёл')
            await send(host_ws, json.dumps({'t': 'leave', 'from': my_id}))
    return ws


def lan_ips():
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except socket.gaierror:
        pass
    return sorted(ip for ip in ips if not ip.startswith('127.'))


def main():
    app = web.Application(middlewares=[no_cache])
    app.router.add_get('/', index)
    app.router.add_get('/ws', ws_handler)
    app.router.add_get('/__coop', ping)
    app.router.add_static('/', ROOT, show_index=False)
    print(f'Игра: http://127.0.0.1:{PORT}/')
    for ip in lan_ips():
        print(f'Для друзей в сети: http://{ip}:{PORT}/')
    web.run_app(app, host='0.0.0.0', port=PORT, print=None)


if __name__ == '__main__':
    main()
