FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/ src/
RUN dotnet publish src/POS.Api/POS.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Usar el puerto dinámico que asigna Render en lugar de uno fijo
ENV ASPNETCORE_URLS=http://+:$PORT
ENTRYPOINT ["dotnet", "POS.Api.dll"]