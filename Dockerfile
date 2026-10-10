# 1) Сборка Angular-приложения
FROM node:20 AS web
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npx ng build

# 2) Сборка ASP.NET Core API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api
WORKDIR /src
COPY backend/ ./backend/
RUN dotnet publish backend/TezRason.Api/TezRason.Api.csproj -c Release -o /app
COPY --from=web /src/frontend/dist/frontend/browser /app/wwwroot

# 3) Итоговый образ
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=api /app ./
ENTRYPOINT ["dotnet", "TezRason.Api.dll"]
