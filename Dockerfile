FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && \
    apt-get install -y curl perl wget make ghostscript software-properties-common && \
    apt-get clean

# Install Node.js (v18 LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    node -v && npm -v

# Install TinyTeX (lightweight LaTeX)
RUN curl -L https://yihui.org/tinytex/install-unx.sh -o install.sh && \
    chmod +x install.sh && \
    ./install.sh && \
    /root/.TinyTeX/bin/*/tlmgr path add

ENV PATH="/root/.TinyTeX/bin/x86_64-linux:$PATH"

# Install required LaTeX packages
RUN tlmgr install \
    latex-bin \
    latex \
    graphics \
    tools \
    geometry \
    xcolor \
    hyperref

# App setup
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 10000
CMD ["npm", "start"]
