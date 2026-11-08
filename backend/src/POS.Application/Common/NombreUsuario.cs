using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;

namespace POS.Application.Common;

public static class NombreUsuario
{
    public static string Slug(string valor)
    {
        var limpio = valor.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var texto = new StringBuilder();
        foreach (var caracter in limpio)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caracter) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(caracter))
            {
                texto.Append(caracter);
            }
            else if (texto.Length > 0 && texto[^1] != '-')
            {
                texto.Append('-');
            }
        }

        return texto.ToString().Trim('-');
    }

    public static string Codigo(string valor)
    {
        var limpio = valor.Trim().ToUpperInvariant();
        var texto = new StringBuilder();
        foreach (var caracter in limpio)
        {
            if (char.IsAsciiLetterOrDigit(caracter))
            {
                texto.Append(caracter);
            }
            else if (caracter is '-' or ' ' && texto.Length > 0 && texto[^1] != '-')
            {
                texto.Append('-');
            }
        }

        return texto.ToString().Trim('-');
    }

    public static string DeEmpresa(string empresaSlug, string persona) =>
        Recortar($"{Slug(empresaSlug)}-{Slug(persona)}");

    public static string DeSucursal(string empresaSlug, string sucursalSlug, string persona) =>
        Recortar($"{Slug(empresaSlug)}-{Slug(sucursalSlug)}-{Slug(persona)}");

    public static async Task<string> Disponible(IAppDbContext db, string baseNombre, CancellationToken cancellationToken)
    {
        var candidato = Recortar(baseNombre);
        for (var numero = 2; numero < 50; numero++)
        {
            var ocupado = await db.Usuarios
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Username == candidato, cancellationToken);
            if (!ocupado)
            {
                return candidato;
            }

            candidato = Recortar($"{baseNombre}-{numero}");
        }

        return Recortar($"{baseNombre}-{Guid.NewGuid().ToString("N")[..4]}");
    }

    private static string Recortar(string valor) => valor.Length <= 80 ? valor : valor[..80].Trim('-');
}
