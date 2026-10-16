// Сервер сетевого коопа «Василий против пришельцев» (docs/COOP.md) — то же, что tools/coop_server.py, но одним
// exe без Python: раздаёт файлы игры из своей папки и пересылает сообщения WebSocket между хостом и клиентами.
//   Клиент → хост: сообщение с пометкой from=<id клиента>. Хост → клиенту: по полю to (без него — всем).
// Сборка: tools/build_coop_server.cmd (компилятор C# из .NET Framework 4.8, он есть в любой Windows 10/11).
// Запуск: VasiliyCoopServer.exe [порт] [--no-browser] — exe лежит в папке игры (рядом с index.html) или в её tools/.
// Только C# 5 (компилятор .NET Framework): без $"", ?. и прочего нового.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

class Peer
{
    public int Id;
    public Stream Out;
    public TcpClient Tcp;
    public bool Closed;
    readonly object sendLock = new object();

    public void Send(string text)
    {
        SendFrame(0x1, Encoding.UTF8.GetBytes(text));
    }

    public void SendFrame(int op, byte[] payload)
    {
        lock (sendLock)
        {
            if (Closed) return;
            try
            {
                byte[] head;
                int n = payload.Length;
                if (n < 126) head = new byte[] { (byte)(0x80 | op), (byte)n };
                else if (n < 65536) head = new byte[] { (byte)(0x80 | op), 126, (byte)(n >> 8), (byte)n };
                else
                {
                    head = new byte[10];
                    head[0] = (byte)(0x80 | op);
                    head[1] = 127;
                    long len = n;
                    for (int i = 0; i < 8; i++) head[9 - i] = (byte)(len >> (8 * i));
                }
                Out.Write(head, 0, head.Length);
                Out.Write(payload, 0, payload.Length);
                Out.Flush();
            }
            catch (Exception)
            {
                Closed = true;
            }
        }
    }

    public void Close()
    {
        if (!Closed) SendFrame(0x8, new byte[0]);
        Closed = true;
        try { Tcp.Close(); } catch (Exception) { }
    }
}

static class CoopServer
{
    static string root;
    static int port = 8090;
    static readonly object gate = new object();
    static Peer host;
    static readonly Dictionary<int, Peer> clients = new Dictionary<int, Peer>();
    static int nextId = 1;

    static readonly Dictionary<string, string> Mime = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" }, { ".js", "text/javascript; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" }, { ".json", "application/json; charset=utf-8" },
        { ".md", "text/plain; charset=utf-8" }, { ".txt", "text/plain; charset=utf-8" },
        { ".png", "image/png" }, { ".jpg", "image/jpeg" }, { ".jpeg", "image/jpeg" }, { ".webp", "image/webp" },
        { ".gif", "image/gif" }, { ".svg", "image/svg+xml" }, { ".ico", "image/x-icon" },
        { ".glb", "model/gltf-binary" }, { ".gltf", "model/gltf+json" }, { ".bin", "application/octet-stream" },
        { ".ogg", "audio/ogg" }, { ".mp3", "audio/mpeg" }, { ".wav", "audio/wav" },
        { ".woff", "font/woff" }, { ".woff2", "font/woff2" }, { ".ttf", "font/ttf" }
    };

    static int Main(string[] args)
    {
        try { Console.OutputEncoding = Encoding.UTF8; } catch (Exception) { }
        Console.Title = "Василий против пришельцев — сервер коопа";
        bool openBrowser = true;
        foreach (string a in args)
        {
            int p;
            if (a == "--no-browser") openBrowser = false;
            else if (int.TryParse(a, out p)) port = p;
        }
        root = FindRoot();
        if (root == null)
        {
            Console.WriteLine("Не найдена игра: положите VasiliyCoopServer.exe в папку игры (рядом с index.html).");
            Console.WriteLine("Нажмите Enter, чтобы закрыть.");
            Console.ReadLine();
            return 1;
        }
        TcpListener listener;
        try
        {
            listener = new TcpListener(IPAddress.Any, port);
            listener.Start();
        }
        catch (SocketException e)
        {
            Console.WriteLine("Порт " + port + " занят или недоступен: " + e.Message);
            Console.WriteLine("Возможно, сервер уже запущен. Другой порт: VasiliyCoopServer.exe 8091");
            Console.WriteLine("Нажмите Enter, чтобы закрыть.");
            Console.ReadLine();
            return 1;
        }
        Console.WriteLine("=== Василий против пришельцев — сервер коопа ===");
        Console.WriteLine("Папка игры: " + root);
        Console.WriteLine();
        Console.WriteLine("Хост (этот ПК):   http://127.0.0.1:" + port + "/");
        foreach (string ip in LanIps()) Console.WriteLine("Для друзей в сети: http://" + ip + ":" + port + "/");
        Console.WriteLine();
        Console.WriteLine("Если Windows спросит про брандмауэр — разрешите доступ в частных сетях.");
        Console.WriteLine("Не закрывайте это окно, пока идёт игра.");
        Console.WriteLine();
        if (openBrowser) { try { Process.Start("http://127.0.0.1:" + port + "/"); } catch (Exception) { } }

        while (true)
        {
            TcpClient c;
            try { c = listener.AcceptTcpClient(); }
            catch (Exception) { continue; }
            Thread t = new Thread(Handle);
            t.IsBackground = true;
            t.Start(c);
        }
    }

    // Папка игры: где лежит exe, или на уровень выше (exe в tools/)
    static string FindRoot()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
        for (int i = 0; i < 3 && dir != null; i++)
        {
            if (File.Exists(Path.Combine(dir, "index.html"))) return Path.GetFullPath(dir);
            DirectoryInfo parent = Directory.GetParent(dir);
            dir = parent == null ? null : parent.FullName;
        }
        return null;
    }

    static List<string> LanIps()
    {
        List<string> list = new List<string>();
        try
        {
            foreach (IPAddress a in Dns.GetHostAddresses(Dns.GetHostName()))
            {
                if (a.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(a)) list.Add(a.ToString());
            }
        }
        catch (Exception) { }
        return list;
    }

    static void Log(string text)
    {
        Console.WriteLine(DateTime.Now.ToString("HH:mm:ss") + "  " + text);
    }

    // --- HTTP: одно соединение — несколько запросов подряд (keep-alive), /ws — WebSocket ---
    static void Handle(object o)
    {
        TcpClient tcp = (TcpClient)o;
        tcp.NoDelay = true;
        NetworkStream ns = tcp.GetStream();
        BufferedStream input = new BufferedStream(ns, 16384);
        try
        {
            while (true)
            {
                string head = ReadHead(input);
                if (head == null) break;
                string[] lines = head.Split(new[] { "\r\n" }, StringSplitOptions.None);
                string[] first = lines[0].Split(' ');
                if (first.Length < 2) break;
                string method = first[0], target = first[1];
                Dictionary<string, string> headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                for (int i = 1; i < lines.Length; i++)
                {
                    int k = lines[i].IndexOf(':');
                    if (k > 0) headers[lines[i].Substring(0, k).Trim()] = lines[i].Substring(k + 1).Trim();
                }
                string path = target, query = "";
                int q = target.IndexOf('?');
                if (q >= 0) { path = target.Substring(0, q); query = target.Substring(q + 1); }
                string upgrade;
                if (path == "/ws" && headers.TryGetValue("Upgrade", out upgrade) && upgrade.ToLowerInvariant() == "websocket")
                {
                    WebSocket(tcp, ns, input, headers, ParseQuery(query));
                    return;
                }
                string conn;
                bool keep = !(headers.TryGetValue("Connection", out conn) && conn.ToLowerInvariant() == "close");
                // Игра спрашивает, есть ли рядом сервер коопа (на GitHub Pages его нет — там предложит скачать)
                if (path == "/__coop") { SendText(ns, "vasiliy-coop", keep); if (!keep) break; continue; }
                ServeFile(ns, method, path, keep);
                if (!keep) break;
            }
        }
        catch (Exception) { }
        finally
        {
            try { tcp.Close(); } catch (Exception) { }
        }
    }

    static string ReadHead(Stream s)
    {
        List<byte> buf = new List<byte>(1024);
        while (true)
        {
            int b = s.ReadByte();
            if (b < 0) return null;
            buf.Add((byte)b);
            int n = buf.Count;
            if (n >= 4 && buf[n - 4] == 13 && buf[n - 3] == 10 && buf[n - 2] == 13 && buf[n - 1] == 10)
                return Encoding.UTF8.GetString(buf.ToArray(), 0, n - 4);
            if (n > 65536) return null;
        }
    }

    static Dictionary<string, string> ParseQuery(string query)
    {
        Dictionary<string, string> d = new Dictionary<string, string>();
        foreach (string part in query.Split('&'))
        {
            if (part.Length == 0) continue;
            int e = part.IndexOf('=');
            string k = e < 0 ? part : part.Substring(0, e);
            string v = e < 0 ? "" : part.Substring(e + 1);
            try { d[Uri.UnescapeDataString(k)] = Uri.UnescapeDataString(v.Replace('+', ' ')); } catch (Exception) { }
        }
        return d;
    }

    static void SendText(Stream output, string text, bool keep)
    {
        byte[] body = Encoding.UTF8.GetBytes(text);
        byte[] h = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " +
            body.Length + "\r\nCache-Control: no-store\r\nConnection: " + (keep ? "keep-alive" : "close") + "\r\n\r\n");
        output.Write(h, 0, h.Length);
        output.Write(body, 0, body.Length);
        output.Flush();
    }

    static void ServeFile(Stream output, string method, string path, bool keep)
    {
        string rel;
        try { rel = Uri.UnescapeDataString(path); } catch (Exception) { rel = path; }
        if (rel == "/" || rel == "") rel = "/index.html";
        string full;
        try { full = Path.GetFullPath(Path.Combine(root, rel.TrimStart('/').Replace('/', Path.DirectorySeparatorChar))); }
        catch (Exception) { full = null; }
        int status = 200;
        byte[] body;
        string type = "application/octet-stream";
        if (full == null || !full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) { status = 403; body = Encoding.UTF8.GetBytes("403"); }
        else if (!File.Exists(full)) { status = 404; body = Encoding.UTF8.GetBytes("404"); }
        else
        {
            body = File.ReadAllBytes(full);
            string m;
            if (Mime.TryGetValue(Path.GetExtension(full), out m)) type = m;
        }
        string reason = status == 200 ? "OK" : status == 404 ? "Not Found" : "Forbidden";
        string headText = "HTTP/1.1 " + status + " " + reason + "\r\n" +
            "Content-Type: " + type + "\r\n" +
            "Content-Length: " + body.Length + "\r\n" +
            "Cache-Control: no-store\r\n" +
            "Connection: " + (keep ? "keep-alive" : "close") + "\r\n\r\n";
        byte[] h = Encoding.ASCII.GetBytes(headText);
        output.Write(h, 0, h.Length);
        if (method != "HEAD") output.Write(body, 0, body.Length);
        output.Flush();
    }

    // --- WebSocket ---
    static void WebSocket(TcpClient tcp, NetworkStream ns, Stream input, Dictionary<string, string> headers, Dictionary<string, string> query)
    {
        string key;
        if (!headers.TryGetValue("Sec-WebSocket-Key", out key)) return;
        string accept;
        using (SHA1 sha = SHA1.Create())
        {
            accept = Convert.ToBase64String(sha.ComputeHash(Encoding.ASCII.GetBytes(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));
        }
        byte[] resp = Encoding.ASCII.GetBytes("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
            "Sec-WebSocket-Accept: " + accept + "\r\n\r\n");
        ns.Write(resp, 0, resp.Length);
        ns.Flush();

        Peer me = new Peer();
        me.Out = ns;
        me.Tcp = tcp;
        string role, name;
        query.TryGetValue("role", out role);
        if (!query.TryGetValue("name", out name)) name = "";
        bool isHost = role == "host";
        lock (gate)
        {
            if (isHost)
            {
                if (host != null && !host.Closed)
                {
                    me.Send("{\"t\":\"error\",\"msg\":\"host_exists\"}");
                    me.Close();
                    return;
                }
                me.Id = 0;
                host = me;
            }
            else
            {
                me.Id = nextId++;
                clients[me.Id] = me;
            }
        }
        if (isHost) Log("хост подключился: " + name);
        else
        {
            Log("игрок " + me.Id + " подключился: " + name);
            Peer h = CurrentHost();
            if (h != null) h.Send("{\"t\":\"join\",\"from\":" + me.Id + ",\"name\":" + Json(name) + "}");
        }
        me.Send("{\"t\":\"hello\",\"id\":" + me.Id + ",\"host\":" + (CurrentHost() != null ? "true" : "false") + "}");

        try
        {
            MemoryStream msg = new MemoryStream();
            while (!me.Closed)
            {
                int b0 = input.ReadByte(), b1 = input.ReadByte();
                if (b0 < 0 || b1 < 0) break;
                bool fin = (b0 & 0x80) != 0;
                int op = b0 & 0x0F;
                bool masked = (b1 & 0x80) != 0;
                long len = b1 & 0x7F;
                if (len == 126)
                {
                    byte[] l2 = ReadExact(input, 2);
                    len = (l2[0] << 8) | l2[1];
                }
                else if (len == 127)
                {
                    byte[] l8 = ReadExact(input, 8);
                    len = 0;
                    for (int i = 0; i < 8; i++) len = (len << 8) | l8[i];
                }
                byte[] mask = masked ? ReadExact(input, 4) : null;
                if (len > 64L * 1024 * 1024) break;
                byte[] data = ReadExact(input, (int)len);
                if (mask != null) for (int i = 0; i < data.Length; i++) data[i] ^= mask[i & 3];
                if (op == 0x8) break;                                   // закрытие
                if (op == 0x9) { me.SendFrame(0xA, data); continue; }  // ping → pong
                if (op == 0xA) continue;
                if (op == 0x1 || op == 0x0)
                {
                    msg.Write(data, 0, data.Length);
                    if (!fin) continue;
                    string text = Encoding.UTF8.GetString(msg.ToArray());
                    msg.SetLength(0);
                    Relay(me, isHost, text);
                }
            }
        }
        catch (Exception) { }
        finally
        {
            me.Close();
            if (isHost)
            {
                lock (gate) { if (host == me) host = null; }
                Log("хост ушёл");
                foreach (Peer c in Clients()) c.Send("{\"t\":\"host_left\"}");
            }
            else
            {
                lock (gate) { clients.Remove(me.Id); }
                Log("игрок " + me.Id + " ушёл");
                Peer h = CurrentHost();
                if (h != null) h.Send("{\"t\":\"leave\",\"from\":" + me.Id + "}");
            }
        }
    }

    // Пересылка: хост → клиенту по {"to":N,...} или всем; клиент → хосту с {"from":id,...}
    static void Relay(Peer from, bool isHost, string text)
    {
        if (text.Length < 2 || text[0] != '{') return;
        if (isHost)
        {
            if (text.StartsWith("{\"to\":"))
            {
                int comma = text.IndexOf(',');
                int to;
                if (comma > 6 && int.TryParse(text.Substring(6, comma - 6), out to))
                {
                    Peer t;
                    lock (gate) { clients.TryGetValue(to, out t); }
                    if (t != null) t.Send(text);
                }
            }
            else foreach (Peer c in Clients()) c.Send(text);
        }
        else
        {
            Peer h = CurrentHost();
            if (h != null) h.Send("{\"from\":" + from.Id + "," + text.Substring(1));
        }
    }

    static Peer CurrentHost()
    {
        lock (gate) { return host != null && !host.Closed ? host : null; }
    }

    static List<Peer> Clients()
    {
        lock (gate) { return new List<Peer>(clients.Values); }
    }

    static byte[] ReadExact(Stream s, int n)
    {
        byte[] buf = new byte[n];
        int got = 0;
        while (got < n)
        {
            int r = s.Read(buf, got, n - got);
            if (r <= 0) throw new IOException("closed");
            got += r;
        }
        return buf;
    }

    static string Json(string s)
    {
        StringBuilder b = new StringBuilder("\"");
        foreach (char ch in s)
        {
            if (ch == '"' || ch == '\\') b.Append('\\').Append(ch);
            else if (ch < 32) b.Append("\\u").Append(((int)ch).ToString("x4"));
            else b.Append(ch);
        }
        return b.Append('"').ToString();
    }
}
