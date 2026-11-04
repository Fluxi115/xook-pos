FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/ src/
RUN dotnet publish src/POS.Api/POS.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render inyecta PORT al arrancar; en local se usa 8080.
ENTRYPOINT ["sh", "-c", "exec dotnet POS.Api.dll --urls http://+:${PORT:-8080}"]
