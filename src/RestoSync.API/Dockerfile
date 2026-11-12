FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

COPY RestoSync.sln ./
COPY src/RestoSync.Domain/*.csproj ./src/RestoSync.Domain/
COPY src/RestoSync.Application/*.csproj ./src/RestoSync.Application/
COPY src/RestoSync.Infrastructure/*.csproj ./src/RestoSync.Infrastructure/
COPY src/RestoSync.API/*.csproj ./src/RestoSync.API/

RUN dotnet restore RestoSync.sln

COPY . ./
RUN dotnet publish src/RestoSync.API/RestoSync.API.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out ./
EXPOSE 8080
ENTRYPOINT ["dotnet", "RestoSync.API.dll"]
