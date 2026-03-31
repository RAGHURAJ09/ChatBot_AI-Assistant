from langchain_community.tools import DuckDuckGoSearchRun

search = DuckDuckGoSearchRun()

def search_web(query: str):
    return search.run(query)
