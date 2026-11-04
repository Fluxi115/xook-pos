using Npgsql;

namespace POS.Infrastructure.Persistence;

public static class NpgsqlConnectionString
{
    public static string Resolve(string? configured)
    {
        var raw = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (string.IsNullOrWhiteSpace(raw))
        {
            raw = configured;
        }

        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new InvalidOperationException("Define DATABASE_URL o ConnectionStrings:DefaultConnection.");
        }

        return Normalize(raw.Trim());
    }

    public static string Normalize(string raw)
    {
        if (!raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return raw;
        }

        var sinEsquema = raw[(raw.IndexOf("://", StringComparison.Ordinal) + 3)..];
        var arroba = sinEsquema.LastIndexOf('@');
        if (arroba <= 0)
        {
            throw new InvalidOperationException("DATABASE_URL debe incluir usuario, contraseña y host.");
        }

        var credenciales = sinEsquema[..arroba];
        var resto = sinEsquema[(arroba + 1)..];
        var separador = credenciales.IndexOf(':');
        var usuario = Uri.UnescapeDataString(separador < 0 ? credenciales : credenciales[..separador]);
        var password = separador < 0 ? string.Empty : Uri.UnescapeDataString(credenciales[(separador + 1)..]);

        var barra = resto.IndexOf('/');
        var hostPuerto = barra < 0 ? resto : resto[..barra];
        var pathYQuery = barra < 0 ? string.Empty : resto[(barra + 1)..];
        var consulta = pathYQuery.IndexOf('?');
        var database = Uri.UnescapeDataString(consulta < 0 ? pathYQuery : pathYQuery[..consulta]);
        var query = consulta < 0 ? string.Empty : pathYQuery[(consulta + 1)..];

        var host = hostPuerto;
        var port = 5432;
        var dosPuntos = hostPuerto.LastIndexOf(':');
        if (dosPuntos > 0 && int.TryParse(hostPuerto[(dosPuntos + 1)..], out var puerto))
        {
            host = hostPuerto[..dosPuntos];
            port = puerto;
        }

        var ssl = query.Contains("sslmode=disable", StringComparison.OrdinalIgnoreCase)
            ? SslMode.Disable
            : SslMode.Require;

        return new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Database = string.IsNullOrWhiteSpace(database) ? "postgres" : database,
            Username = usuario,
            Password = password,
            SslMode = ssl,
        }.ConnectionString;
    }
}
